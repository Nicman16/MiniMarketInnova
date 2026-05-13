const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verificarToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { getDb } = require('../config/firebase');
const { getSessionVersion } = require('../config/sessionVersion');
const { hashVerificationToken, createVerificationToken, sendVerificationEmail } = require('../utils/email');
const { updateAuthAfterActivation } = require('../utils/firebaseAuthSync');

const router = express.Router();

const getUsuarioPorEmail = async (email) => {
  const db = getDb();
  const snap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
};

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, contraseña, password } = req.body;
    const passwordInput = contraseña || password;

    if (!email || !passwordInput) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const usuario = await getUsuarioPorEmail(email.toLowerCase());
    if (!usuario) {
      console.error(`[LOGIN FAIL] email=${email} | reason=user_not_found`);
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    if (usuario.estado !== 'activo') {
      console.error(`[LOGIN FAIL] email=${email} | reason=inactive | estado=${usuario.estado}`);
      return res.status(403).json({ error: 'La cuenta está inactiva' });
    }

    if (!usuario.emailVerificado) {
      console.error(`[LOGIN FAIL] email=${email} | reason=email_not_verified`);
      return res.status(403).json({ error: 'Debes verificar tu correo antes de iniciar sesión' });
    }

    const esValida = await bcrypt.compare(passwordInput, usuario.contraseña);
    if (!esValida) {
      console.error(`[LOGIN FAIL] email=${email} | reason=wrong_password`);
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, sessionVersion: getSessionVersion() },
      process.env.JWT_SECRET || 'tu_clave_secreta_aqui',
      { expiresIn: '7d' }
    );

    await getDb().collection('usuarios').doc(usuario.id).update({ ultimoAcceso: new Date() });
    const { contraseña: _, ...usuarioSinPassword } = usuario;
    res.json({ token, usuario: usuarioSinPassword });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al intentar login' });
  }
});

// POST /api/auth/registro (deshabilitado)
router.post('/registro', (req, res) => {
  res.status(403).json({ error: 'El registro público está deshabilitado. Un jefe debe crear la cuenta.' });
});

// POST /api/auth/activar
router.post('/activar', async (req, res) => {
  try {
    const { token, contraseña, password } = req.body;
    const passwordInput = contraseña || password;

    if (!token || !passwordInput) {
      return res.status(400).json({ error: 'Token y contraseña son requeridos' });
    }

    if (String(passwordInput).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const db = getDb();
    const tokenHash = hashVerificationToken(token);
    const snap = await db.collection('usuarios').where('tokenVerificacionHash', '==', tokenHash).limit(1).get();
    if (snap.empty) {
      return res.status(400).json({ error: 'El enlace de activación no es válido o ya venció' });
    }
    const docRef = snap.docs[0];
    const usuario = docRef.data();
    const expira = usuario.tokenVerificacionExpira?.toDate ? usuario.tokenVerificacionExpira.toDate() : new Date(usuario.tokenVerificacionExpira);

    if (expira < new Date()) {
      return res.status(400).json({ error: 'El enlace de activación no es válido o ya venció' });
    }

    const salt = await bcrypt.genSalt(10);
    const contraseniaHasheada = await bcrypt.hash(passwordInput, salt);
    await db.collection('usuarios').doc(docRef.id).update({
      contraseña: contraseniaHasheada,
      emailVerificado: true,
      tokenVerificacionHash: null,
      tokenVerificacionExpira: null
    });

    await updateAuthAfterActivation({
      email: usuario.email,
      password: passwordInput
    });

    res.json({ mensaje: 'Cuenta activada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en activación:', error);
    res.status(500).json({ error: 'Error al activar la cuenta' });
  }
});

// GET /api/auth/me
router.get('/me', verificarToken, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('usuarios').doc(req.usuario.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { contraseña: _, ...usuario } = { id: doc.id, ...doc.data() };
    res.json(usuario);
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
});

module.exports = router;
