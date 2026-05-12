const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { verificarToken, requireJefe } = require('../middleware/auth');
const { getDb, firestoreDoc, firestoreDocs } = require('../config/firebase');
const { createVerificationToken, sendVerificationEmail } = require('../utils/email');
const { upsertAuthUser } = require('../utils/firebaseAuthSync');
const { normalizeEmpleado } = require('../utils/normalize');

const router = express.Router();

// GET /api/empleados
router.get('/', verificarToken, requireJefe, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('usuarios').orderBy('fechaCreacion', 'desc').get();
    const usuarios = firestoreDocs(snap).map(({ contraseña: _, ...u }) => u);
    res.json(usuarios.map(normalizeEmpleado));
  } catch (error) {
    console.error('Error en GET /api/empleados:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// POST /api/empleados
router.post('/', verificarToken, requireJefe, async (req, res) => {
  try {
    const { nombre, email, rol = 'empleado', pin } = req.body;

    if (!nombre || !email || !pin) {
      return res.status(400).json({ error: 'Nombre, email y PIN son requeridos' });
    }

    if (String(pin).length < 4) {
      return res.status(400).json({ error: 'El PIN debe tener al menos 4 dígitos' });
    }

    const db = getDb();
    const emailSnap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
    if (!emailSnap.empty) {
      return res.status(400).json({ error: 'Ya existe un empleado con ese email' });
    }

    const pinSnap = await db.collection('usuarios').where('pin', '==', pin).limit(1).get();
    if (!pinSnap.empty) {
      return res.status(400).json({ error: 'Ya existe un empleado con ese PIN' });
    }

    const passwordTemporal = crypto.randomBytes(24).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const contraseniaHasheada = await bcrypt.hash(passwordTemporal, salt);
    const verification = createVerificationToken();

    const authUser = await upsertAuthUser({
      email,
      password: passwordTemporal,
      displayName: nombre,
      emailVerified: false,
      disabled: false
    });

    const docRef = await db.collection('usuarios').add({
      nombre, email,
      contraseña: contraseniaHasheada,
      pin, rol,
      firebaseUid: authUser.uid,
      estado: 'activo',
      emailVerificado: false,
      tokenVerificacionHash: verification.tokenHash,
      tokenVerificacionExpira: verification.expiresAt,
      fechaCreacion: new Date()
    });

    const nuevoEmpleado = { id: docRef.id, nombre, email, pin, rol, estado: 'activo', emailVerificado: false, fechaCreacion: new Date() };
    const emailResult = await sendVerificationEmail({ email, nombre, token: verification.rawToken });

    res.status(201).json({
      ...normalizeEmpleado(nuevoEmpleado),
      invitacionEnviada: emailResult.sent,
      activationLink: emailResult.activationLink
    });
  } catch (error) {
    console.error('Error en POST /api/empleados:', error);
    res.status(500).json({ error: 'Error al crear empleado' });
  }
});

// PUT /api/empleados/:id
router.put('/:id', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, pin, activo } = req.body;

    const db = getDb();
    const docSnap = await db.collection('usuarios').doc(id).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Empleado no encontrado' });
    const empleado = firestoreDoc(docSnap);
    const cambios = {};

    if (email && email !== empleado.email) {
      const emailSnap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
      if (!emailSnap.empty && emailSnap.docs[0].id !== id) return res.status(400).json({ error: 'Ya existe un empleado con ese email' });
      cambios.email = email;
    }

    if (pin && pin !== empleado.pin) {
      if (String(pin).length < 4) return res.status(400).json({ error: 'El PIN debe tener al menos 4 dígitos' });
      const pinSnap = await db.collection('usuarios').where('pin', '==', pin).limit(1).get();
      if (!pinSnap.empty && pinSnap.docs[0].id !== id) return res.status(400).json({ error: 'Ya existe un empleado con ese PIN' });
      cambios.pin = pin;
    }

    if (typeof nombre === 'string') cambios.nombre = nombre;
    if (rol === 'jefe' || rol === 'empleado') cambios.rol = rol;
    if (typeof activo === 'boolean') cambios.estado = activo ? 'activo' : 'inactivo';

    await db.collection('usuarios').doc(id).update(cambios);
    const actualizado = { ...empleado, ...cambios };
    res.json(normalizeEmpleado(actualizado));
  } catch (error) {
    console.error('Error en PUT /api/empleados/:id:', error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// PATCH /api/empleados/:id/toggle-estado
router.patch('/:id/toggle-estado', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const docSnap = await db.collection('usuarios').doc(id).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Empleado no encontrado' });
    const empleado = firestoreDoc(docSnap);

    if (empleado.rol === 'jefe' && empleado.estado === 'activo') {
      const jefesSnap = await db.collection('usuarios').where('rol', '==', 'jefe').where('estado', '==', 'activo').get();
      if (jefesSnap.size <= 1) {
        return res.status(400).json({ error: 'No se puede desactivar el último jefe' });
      }
    }

    const nuevoEstado = empleado.estado === 'activo' ? 'inactivo' : 'activo';
    await db.collection('usuarios').doc(id).update({ estado: nuevoEstado });
    res.json(normalizeEmpleado({ ...empleado, estado: nuevoEstado }));
  } catch (error) {
    console.error('Error en PATCH /api/empleados/:id/toggle-estado:', error);
    res.status(500).json({ error: 'Error al cambiar estado del empleado' });
  }
});

// DELETE /api/empleados/:id
router.delete('/:id', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.usuario.id === id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    const db = getDb();
    const docSnap = await db.collection('usuarios').doc(id).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Empleado no encontrado' });
    const empleado = firestoreDoc(docSnap);

    if (empleado.rol === 'jefe') {
      const jefesSnap = await db.collection('usuarios').where('rol', '==', 'jefe').get();
      if (jefesSnap.size <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el último jefe' });
      }
    }

    await db.collection('usuarios').doc(id).delete();
    res.status(204).send();
  } catch (error) {
    console.error('Error en DELETE /api/empleados/:id:', error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

module.exports = router;
