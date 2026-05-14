const express = require('express');
const { verificarToken, requireJefe } = require('../middleware/auth');
const { getDb, firestoreDoc, firestoreDocs } = require('../config/firebase');
const { normalizeSesionCaja, normalizeMovimientoCaja } = require('../utils/normalize');
const { buildDayRange, getVentasEntreFechas, resumirVentas } = require('../utils/ventasHelper');
const { emit } = require('../socket/io');

const router = express.Router();

// GET /api/caja/sesion-activa
router.get('/sesion-activa', verificarToken, requireJefe, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('sesionCaja').where('estado', '==', 'abierta').orderBy('fechaApertura', 'desc').limit(1).get();
    res.json(snap.empty ? null : normalizeSesionCaja(firestoreDoc(snap.docs[0])));
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

    const db = getDb();
    const sesionSnap = await db.collection('sesionCaja').where('estado', '==', 'abierta').limit(1).get();
    if (!sesionSnap.empty) return res.status(400).json({ error: 'Ya hay una sesión de caja abierta' });

    const empDoc = await db.collection('usuarios').doc(empleadoId).get();
    if (!empDoc.exists) return res.status(404).json({ error: 'Empleado no encontrado o inactivo' });
    const empleado = firestoreDoc(empDoc);
    if (empleado.estado !== 'activo') {
      return res.status(404).json({ error: 'Empleado no encontrado o inactivo' });
    }

    if (empleado.pin !== pin) return res.status(401).json({ error: 'PIN incorrecto' });

    const sesionData = {
      empleadoId: empleado.id, empleadoNombre: empleado.nombre,
      empleadoEmail: empleado.email, empleadoRol: empleado.rol,
      montoApertura: Number(montoApertura), estado: 'abierta'
    };
    const sesionRef = await db.collection('sesionCaja').add(sesionData);
    const sesion = { id: sesionRef.id, ...sesionData, fechaApertura: new Date() };

    await db.collection('movimientosCaja').add({
      sesionId: sesionRef.id, tipo: 'ingreso', monto: Number(montoApertura),
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
    const { montoCierre, montoDejado, recibidoPorId } = req.body;

    const db = getDb();
    const docRef = db.collection('sesionCaja').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Sesión no encontrada' });
    const sesionData = firestoreDoc(docSnap);
    if (sesionData.estado === 'cerrada') return res.status(400).json({ error: 'La sesión ya está cerrada' });

    let recibidoPor = null;
    if (recibidoPorId) {
      const empDoc = await db.collection('usuarios').doc(recibidoPorId).get();
      if (empDoc.exists) {
        const emp = firestoreDoc(empDoc);
        recibidoPor = {
          id: emp.id,
          nombre: emp.nombre,
          email: emp.email,
          rol: emp.rol,
          activo: emp.estado === 'activo'
        };
      }
    }

    // Historial de entregas
    let historialEntregas = Array.isArray(sesionData.historialEntregas) ? sesionData.historialEntregas : [];
    if (typeof montoDejado !== 'undefined' && recibidoPor) {
      historialEntregas.push({
        entregadoPor: {
          id: sesionData.empleadoId,
          nombre: sesionData.empleadoNombre,
          email: sesionData.empleadoEmail,
          rol: sesionData.empleadoRol,
          activo: true
        },
        recibidoPor,
        fecha: new Date(),
        montoDejado: Number(montoDejado)
      });
    }

    const cambios = {
      fechaCierre: new Date(),
      montoCierre: Number(montoCierre || 0),
      montoDejado: typeof montoDejado !== 'undefined' ? Number(montoDejado) : undefined,
      recibidoPor: recibidoPor || null,
      historialEntregas,
      estado: 'cerrada'
    };
    await docRef.update(cambios);
    const sesion = { ...sesionData, ...cambios };

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

    const db = getDb();
    const sesionSnap = await db.collection('sesionCaja').where('estado', '==', 'abierta').orderBy('fechaApertura', 'desc').limit(1).get();
    if (sesionSnap.empty) return res.status(400).json({ error: 'No hay una sesión de caja abierta' });
    const sesionDoc = sesionSnap.docs[0];
    const sesion = firestoreDoc(sesionDoc);

    const empDoc = await db.collection('usuarios').doc(empleadoId).get();
    if (!empDoc.exists) return res.status(404).json({ error: 'Empleado no encontrado' });
    const empleado = firestoreDoc(empDoc);

    const movData = {
      sesionId: sesion.id, tipo, monto: Number(monto), concepto,
      empleadoId: empleado.id, empleadoNombre: empleado.nombre,
      empleadoEmail: empleado.email, empleadoRol: empleado.rol
    };
    const movRef = await db.collection('movimientosCaja').add(movData);
    const movimiento = { id: movRef.id, ...movData, fecha: new Date() };

    const ingresos = Number(sesion.ingresos || 0);
    const egresos = Number(sesion.egresos || 0);
    if (tipo === 'ingreso') await sesionDoc.ref.update({ ingresos: ingresos + Number(monto) });
    else if (tipo === 'egreso') await sesionDoc.ref.update({ egresos: egresos + Number(monto) });

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
    const db = getDb();
    const snap = await db.collection('movimientosCaja').where('fecha', '>=', inicio).where('fecha', '<=', fin).orderBy('fecha', 'desc').get();
    res.json(firestoreDocs(snap).map(normalizeMovimientoCaja));
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
    const db = getDb();
    const sesionSnap = await db.collection('sesionCaja').where('fechaApertura', '>=', inicio).where('fechaApertura', '<=', fin).orderBy('fechaApertura', 'desc').limit(1).get();
    const sesion = sesionSnap.empty ? null : firestoreDoc(sesionSnap.docs[0]);
    const movSnap = await db.collection('movimientosCaja').where('fecha', '>=', inicio).where('fecha', '<=', fin).get();
    const movimientos = firestoreDocs(movSnap);
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
