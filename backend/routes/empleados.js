const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { verificarToken, requireJefe } = require('../middleware/auth');
const Usuario = require('../models/Usuario');
const { createVerificationToken, sendVerificationEmail } = require('../utils/email');
const { normalizeEmpleado } = require('../utils/normalize');

const router = express.Router();

// GET /api/empleados
router.get('/', verificarToken, requireJefe, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-contraseña').sort({ fechaCreacion: -1 });
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

    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Ya existe un empleado con ese email' });
    }

    const pinExistente = await Usuario.findOne({ pin });
    if (pinExistente) {
      return res.status(400).json({ error: 'Ya existe un empleado con ese PIN' });
    }

    const passwordTemporal = crypto.randomBytes(24).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const contraseniaHasheada = await bcrypt.hash(passwordTemporal, salt);
    const verification = createVerificationToken();

    const nuevoEmpleado = await Usuario.create({
      nombre, email,
      contraseña: contraseniaHasheada,
      pin, rol,
      estado: 'activo',
      emailVerificado: false,
      tokenVerificacionHash: verification.tokenHash,
      tokenVerificacionExpira: verification.expiresAt
    });

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

    const empleado = await Usuario.findById(id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

    if (email && email !== empleado.email) {
      const emailExistente = await Usuario.findOne({ email, _id: { $ne: id } });
      if (emailExistente) return res.status(400).json({ error: 'Ya existe un empleado con ese email' });
      empleado.email = email;
    }

    if (pin && pin !== empleado.pin) {
      if (String(pin).length < 4) return res.status(400).json({ error: 'El PIN debe tener al menos 4 dígitos' });
      const pinExistente = await Usuario.findOne({ pin, _id: { $ne: id } });
      if (pinExistente) return res.status(400).json({ error: 'Ya existe un empleado con ese PIN' });
      empleado.pin = pin;
    }

    if (typeof nombre === 'string') empleado.nombre = nombre;
    if (rol === 'jefe' || rol === 'empleado') empleado.rol = rol;
    if (typeof activo === 'boolean') empleado.estado = activo ? 'activo' : 'inactivo';

    await empleado.save();
    res.json(normalizeEmpleado(empleado));
  } catch (error) {
    console.error('Error en PUT /api/empleados/:id:', error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// PATCH /api/empleados/:id/toggle-estado
router.patch('/:id/toggle-estado', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;
    const empleado = await Usuario.findById(id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

    if (empleado.rol === 'jefe' && empleado.estado === 'activo') {
      const jefesActivos = await Usuario.countDocuments({ rol: 'jefe', estado: 'activo' });
      if (jefesActivos <= 1) {
        return res.status(400).json({ error: 'No se puede desactivar el último jefe' });
      }
    }

    empleado.estado = empleado.estado === 'activo' ? 'inactivo' : 'activo';
    await empleado.save();
    res.json(normalizeEmpleado(empleado));
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

    const empleado = await Usuario.findById(id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

    if (empleado.rol === 'jefe') {
      const totalJefes = await Usuario.countDocuments({ rol: 'jefe' });
      if (totalJefes <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el último jefe' });
      }
    }

    await Usuario.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error en DELETE /api/empleados/:id:', error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

module.exports = router;
