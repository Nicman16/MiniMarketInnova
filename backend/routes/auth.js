const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { verificarToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const Usuario = require('../models/Usuario');
const { hashVerificationToken, createVerificationToken, sendVerificationEmail } = require('../utils/email');

const router = express.Router();

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, contraseña, password } = req.body;
    const passwordInput = contraseña || password;

    if (!email || !passwordInput) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      console.error(`[LOGIN FAIL] email=${email} | reason=user_not_found`);
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    if (usuario.estado !== 'activo') {
      console.error(`[LOGIN FAIL] email=${email} | reason=inactive | estado=${usuario.estado}`);
      return res.status(403).json({ error: 'La cuenta está inactiva' });
    }

    if (!usuario.emailVerificado) {
      console.error(`[LOGIN FAIL] email=${email} | reason=email_not_verified | emailVerificado=${usuario.emailVerificado}`);
      return res.status(403).json({ error: 'Debes verificar tu correo antes de iniciar sesión' });
    }

    const esValida = await bcrypt.compare(passwordInput, usuario.contraseña);
    if (!esValida) {
      console.error(`[LOGIN FAIL] email=${email} | reason=wrong_password`);
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET || 'tu_clave_secreta_aqui',
      { expiresIn: '7d' }
    );

    usuario.ultimoAcceso = new Date();
    await usuario.save();

    const usuarioSinPassword = usuario.toObject();
    delete usuarioSinPassword.contraseña;

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

    const tokenHash = hashVerificationToken(token);
    const usuario = await Usuario.findOne({
      tokenVerificacionHash: tokenHash,
      tokenVerificacionExpira: { $gt: new Date() }
    });

    if (!usuario) {
      return res.status(400).json({ error: 'El enlace de activación no es válido o ya venció' });
    }

    const salt = await bcrypt.genSalt(10);
    usuario.contraseña = await bcrypt.hash(passwordInput, salt);
    usuario.emailVerificado = true;
    usuario.tokenVerificacionHash = undefined;
    usuario.tokenVerificacionExpira = undefined;
    await usuario.save();

    res.json({ mensaje: 'Cuenta activada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en activación:', error);
    res.status(500).json({ error: 'Error al activar la cuenta' });
  }
});

// GET /api/auth/me
router.get('/me', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-contraseña');
    res.json(usuario);
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
});

module.exports = router;
