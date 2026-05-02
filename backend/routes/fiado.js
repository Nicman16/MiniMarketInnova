const express = require('express');
const { verificarToken } = require('../middleware/auth');
const Deuda = require('../models/Deuda');
const TransaccionDeuda = require('../models/TransaccionDeuda');

const router = express.Router();

// POST /api/deuda/crear
router.post('/crear', verificarToken, async (req, res) => {
  try {
    const { tipo, referencia, nombrePersona, monto, razon } = req.body;

    if (!tipo || !referencia || !nombrePersona || !monto) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const nuevaDeuda = await Deuda.create({
      tipo, referencia, nombrePersona, monto,
      razon: razon || 'Sin especificar',
      saldo: monto, fecha: new Date()
    });

    res.status(201).json({ mensaje: 'Deuda creada exitosamente', deuda: nuevaDeuda });
  } catch (error) {
    console.error('Error crear deuda:', error);
    res.status(500).json({ error: 'Error al crear deuda' });
  }
});

// GET /api/deuda/lista
router.get('/lista', verificarToken, async (req, res) => {
  try {
    const { tipo, estado } = req.query;
    const filtro = {};
    if (tipo) filtro.tipo = tipo;
    if (estado) filtro.estado = estado;

    const deudas = await Deuda.find(filtro).sort({ fecha: -1 });
    res.json(deudas);
  } catch (error) {
    console.error('Error obtener deudas:', error);
    res.status(500).json({ error: 'Error al obtener deudas' });
  }
});

// GET /api/deuda/persona/:referencia
router.get('/persona/:referencia', verificarToken, async (req, res) => {
  try {
    const { referencia } = req.params;
    const deudas = await Deuda.find({ referencia }).sort({ fecha: -1 });
    const deudaPendiente = deudas.reduce((sum, d) => sum + (d.saldo || 0), 0);
    res.json({ deudas, totalDeuda: deudaPendiente });
  } catch (error) {
    console.error('Error obtener deudas de persona:', error);
    res.status(500).json({ error: 'Error al obtener deudas' });
  }
});

// GET /api/deuda/:deudaId/transacciones
router.get('/:deudaId/transacciones', verificarToken, async (req, res) => {
  try {
    const { deudaId } = req.params;
    const transacciones = await TransaccionDeuda.find({ deudaId }).sort({ fecha: -1 });
    res.json(transacciones);
  } catch (error) {
    console.error('Error obtener transacciones:', error);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

// POST /api/deuda/transaccion
router.post('/transaccion', verificarToken, async (req, res) => {
  try {
    const { deudaId, tipo, monto, razon, empleadoRegistro } = req.body;

    if (!deudaId || !tipo || !monto) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const deuda = await Deuda.findById(deudaId);
    if (!deuda) return res.status(404).json({ error: 'Deuda no encontrada' });

    const nuevaTransaccion = await TransaccionDeuda.create({
      deudaId, tipo, monto,
      razon: razon || 'Sin especificar',
      empleadoRegistro: empleadoRegistro || req.usuario.email,
      fecha: new Date()
    });

    if (tipo === 'cargo') {
      deuda.saldo += monto;
      deuda.estado = 'parcial';
    } else if (tipo === 'abono') {
      deuda.saldo -= monto;
      if (deuda.saldo <= 0) {
        deuda.estado = 'pagada';
        deuda.saldo = 0;
      } else {
        deuda.estado = 'parcial';
      }
    }
    await deuda.save();

    res.status(201).json({ mensaje: 'Transacción registrada', transaccion: nuevaTransaccion, nuevoSaldo: deuda.saldo, estado: deuda.estado });
  } catch (error) {
    console.error('Error registrar transacción:', error);
    res.status(500).json({ error: 'Error al registrar transacción' });
  }
});

// PUT /api/deuda/:deudaId
router.put('/:deudaId', verificarToken, async (req, res) => {
  try {
    const { deudaId } = req.params;
    const { estado } = req.body;

    const deuda = await Deuda.findByIdAndUpdate(deudaId, { estado }, { new: true });
    if (!deuda) return res.status(404).json({ error: 'Deuda no encontrada' });

    res.json({ mensaje: 'Deuda actualizada', deuda });
  } catch (error) {
    console.error('Error actualizar deuda:', error);
    res.status(500).json({ error: 'Error al actualizar deuda' });
  }
});

module.exports = router;
