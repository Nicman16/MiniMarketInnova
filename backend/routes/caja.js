const express = require('express');
const { verificarToken, requireJefe } = require('../middleware/auth');
const SesionCaja = require('../models/SesionCaja');
const MovimientoCaja = require('../models/MovimientoCaja');
const Usuario = require('../models/Usuario');
const { normalizeSesionCaja, normalizeMovimientoCaja } = require('../utils/normalize');
const { buildDayRange, getVentasEntreFechas, resumirVentas } = require('../utils/ventasHelper');
const { emit } = require('../socket/io');

const router = express.Router();

// GET /api/caja/sesion-activa
router.get('/sesion-activa', verificarToken, requireJefe, async (req, res) => {
  try {
    const sesion = await SesionCaja.findOne({ estado: 'abierta' }).sort({ fechaApertura: -1 });
    res.json(sesion ? normalizeSesionCaja(sesion) : null);
  } catch (error) {
    console.error('Error en GET /api/caja/sesion-activa:', error);
    res.status(500).json({ error: 'Error al obtener sesión activa' });
  }
});

// POST /api/caja/abrir
router.post('/abrir', verificarToken, requireJefe, async (req, res) => {
  try {
    const { empleadoId, pin, montoApertura } = req.body;

    if (!empleadoId || !pin || !montoApertura) {
      return res.status(400).json({ error: 'Empleado, PIN y monto de apertura son requeridos' });
    }

    const sesionExistente = await SesionCaja.findOne({ estado: 'abierta' });
    if (sesionExistente) return res.status(400).json({ error: 'Ya hay una sesión de caja abierta' });

    const empleado = await Usuario.findById(empleadoId);
    if (!empleado || empleado.estado !== 'activo') {
      return res.status(404).json({ error: 'Empleado no encontrado o inactivo' });
    }

    if (empleado.pin !== pin) return res.status(401).json({ error: 'PIN incorrecto' });

    const sesion = await SesionCaja.create({
      empleadoId: empleado._id, empleadoNombre: empleado.nombre,
      empleadoEmail: empleado.email, empleadoRol: empleado.rol,
      montoApertura: Number(montoApertura), estado: 'abierta'
    });

    await MovimientoCaja.create({
      sesionId: sesion._id, tipo: 'ingreso', monto: Number(montoApertura),
      concepto: 'Apertura de caja', empleadoId: empleado._id,
      empleadoNombre: empleado.nombre, empleadoEmail: empleado.email, empleadoRol: empleado.rol
    });

    const sesionNormalizada = normalizeSesionCaja(sesion);
    emit('caja-abierta', sesionNormalizada);
    res.status(201).json(sesionNormalizada);
  } catch (error) {
    console.error('Error en POST /api/caja/abrir:', error);
    res.status(500).json({ error: 'Error al abrir caja' });
  }
});

// POST /api/caja/:id/cerrar
router.post('/:id/cerrar', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;
    const { montoCierre } = req.body;

    const sesion = await SesionCaja.findById(id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (sesion.estado === 'cerrada') return res.status(400).json({ error: 'La sesión ya está cerrada' });

    sesion.fechaCierre = new Date();
    sesion.montoCierre = Number(montoCierre || 0);
    sesion.estado = 'cerrada';
    await sesion.save();

    const sesionNormalizada = normalizeSesionCaja(sesion);
    emit('caja-cerrada', sesionNormalizada);
    res.json(sesionNormalizada);
  } catch (error) {
    console.error('Error en POST /api/caja/:id/cerrar:', error);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
});

// POST /api/caja/movimiento
router.post('/movimiento', verificarToken, requireJefe, async (req, res) => {
  try {
    const { tipo, monto, concepto, empleadoId } = req.body;

    if (!tipo || !monto || !concepto || !empleadoId) {
      return res.status(400).json({ error: 'Tipo, monto, concepto y empleado son requeridos' });
    }

    const sesion = await SesionCaja.findOne({ estado: 'abierta' }).sort({ fechaApertura: -1 });
    if (!sesion) return res.status(400).json({ error: 'No hay una sesión de caja abierta' });

    const empleado = await Usuario.findById(empleadoId);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

    const movimiento = await MovimientoCaja.create({
      sesionId: sesion._id, tipo, monto: Number(monto), concepto,
      empleadoId: empleado._id, empleadoNombre: empleado.nombre,
      empleadoEmail: empleado.email, empleadoRol: empleado.rol
    });

    if (tipo === 'ingreso') sesion.ingresos += Number(monto);
    else if (tipo === 'egreso') sesion.egresos += Number(monto);
    await sesion.save();

    const movimientoNormalizado = normalizeMovimientoCaja(movimiento);
    emit('movimiento-caja', movimientoNormalizado);
    res.status(201).json(movimientoNormalizado);
  } catch (error) {
    console.error('Error en POST /api/caja/movimiento:', error);
    res.status(500).json({ error: 'Error al registrar movimiento de caja' });
  }
});

// GET /api/caja/movimientos
router.get('/movimientos', verificarToken, requireJefe, async (req, res) => {
  try {
    const fecha = String(req.query.fecha || new Date().toISOString().split('T')[0]);
    const { inicio, fin } = buildDayRange(fecha);
    const movimientos = await MovimientoCaja.find({ fecha: { $gte: inicio, $lte: fin } }).sort({ fecha: -1 });
    res.json(movimientos.map(normalizeMovimientoCaja));
  } catch (error) {
    console.error('Error en GET /api/caja/movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// GET /api/caja/resumen
router.get('/resumen', verificarToken, requireJefe, async (req, res) => {
  try {
    const fecha = String(req.query.fecha || new Date().toISOString().split('T')[0]);
    const { inicio, fin } = buildDayRange(fecha);
    const sesion = await SesionCaja.findOne({ fechaApertura: { $gte: inicio, $lte: fin } }).sort({ fechaApertura: -1 });
    const movimientos = await MovimientoCaja.find({ fecha: { $gte: inicio, $lte: fin } });
    const ventas = await getVentasEntreFechas(inicio, fin);
    const resumenVentas = resumirVentas(ventas);

    const ingresos = movimientos.filter((m) => m.tipo === 'ingreso' && m.concepto !== 'Apertura de caja').reduce((t, m) => t + m.monto, 0);
    const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((t, m) => t + m.monto, 0);
    const totalEnCaja = (sesion?.montoApertura || 0) + resumenVentas.ventasEfectivo + ingresos - egresos;

    res.json({ ...resumenVentas, ingresos, egresos, totalEnCaja, sesionActiva: sesion ? normalizeSesionCaja(sesion) : null });
  } catch (error) {
    console.error('Error en GET /api/caja/resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen de caja' });
  }
});

// GET /api/caja/resumen-cierre
router.get('/resumen-cierre', verificarToken, requireJefe, async (req, res) => {
  try {
    const sesion = await SesionCaja.findOne({ estado: 'abierta' }).sort({ fechaApertura: -1 });
    if (!sesion) return res.status(404).json({ error: 'No hay una sesión de caja abierta' });

    const fecha = new Date(sesion.fechaApertura).toISOString().split('T')[0];
    const { inicio, fin } = buildDayRange(fecha);
    const movimientos = await MovimientoCaja.find({ fecha: { $gte: inicio, $lte: fin } });
    const ventas = await getVentasEntreFechas(inicio, fin);
    const resumenVentas = resumirVentas(ventas);

    const ingresos = movimientos.filter((m) => m.tipo === 'ingreso' && m.concepto !== 'Apertura de caja').reduce((t, m) => t + m.monto, 0);
    const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((t, m) => t + m.monto, 0);
    const totalEsperado = (sesion.montoApertura || 0) + resumenVentas.ventasEfectivo + ingresos - egresos;

    res.json({ ...resumenVentas, ingresos, egresos, totalEsperado });
  } catch (error) {
    console.error('Error en GET /api/caja/resumen-cierre:', error);
    res.status(500).json({ error: 'Error al obtener resumen para cierre' });
  }
});

module.exports = router;
