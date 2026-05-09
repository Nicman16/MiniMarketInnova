const express = require('express');
const { verificarToken } = require('../middleware/auth');
const { getDb, firestoreDoc, firestoreDocs } = require('../config/firebase');

const router = express.Router();

// POST /api/deuda/crear
router.post('/crear', verificarToken, async (req, res) => {
  try {
    const { tipo, referencia, nombrePersona, monto, razon } = req.body;
    if (!tipo || !referencia || !nombrePersona || !monto) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    const db = getDb();
    const data = { tipo, referencia, nombrePersona, monto: Number(monto), razon: razon || 'Sin especificar', saldo: Number(monto), estado: 'pendiente', fecha: new Date() };
    const docRef = await db.collection('deudas').add(data);
    res.status(201).json({ mensaje: 'Deuda creada exitosamente', deuda: { id: docRef.id, ...data } });
  } catch (error) {
    console.error('Error crear deuda:', error);
    res.status(500).json({ error: 'Error al crear deuda' });
  }
});

// GET /api/deuda/lista
router.get('/lista', verificarToken, async (req, res) => {
  try {
    const { tipo, estado } = req.query;
    const db = getDb();
    let query = db.collection('deudas').orderBy('fecha', 'desc');
    if (tipo) query = query.where('tipo', '==', tipo);
    if (estado) query = query.where('estado', '==', estado);
    const snap = await query.get();
    res.json(firestoreDocs(snap));
  } catch (error) {
    console.error('Error obtener deudas:', error);
    res.status(500).json({ error: 'Error al obtener deudas' });
  }
});

// GET /api/deuda/persona/:referencia
router.get('/persona/:referencia', verificarToken, async (req, res) => {
  try {
    const { referencia } = req.params;
    const db = getDb();
    const snap = await db.collection('deudas').where('referencia', '==', referencia).orderBy('fecha', 'desc').get();
    const deudas = firestoreDocs(snap);
    const deudaPendiente = deudas.reduce((sum, d) => sum + Number(d.saldo || 0), 0);
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
    const db = getDb();
    const snap = await db.collection('transaccionesDeuda').where('deudaId', '==', deudaId).orderBy('fecha', 'desc').get();
    res.json(firestoreDocs(snap));
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
    const db = getDb();
    const deudaRef = db.collection('deudas').doc(deudaId);
    const deudaDoc = await deudaRef.get();
    if (!deudaDoc.exists) return res.status(404).json({ error: 'Deuda no encontrada' });
    const deuda = firestoreDoc(deudaDoc);

    let nuevoSaldo = Number(deuda.saldo || 0);
    let nuevoEstado = deuda.estado || 'pendiente';
    if (tipo === 'cargo') { nuevoSaldo += Number(monto); nuevoEstado = 'parcial'; }
    else if (tipo === 'abono') {
      nuevoSaldo -= Number(monto);
      if (nuevoSaldo < 0) nuevoSaldo = 0;
      nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'parcial';
    }

    const transData = { deudaId, tipo, monto: Number(monto), razon: razon || 'Sin especificar', empleadoRegistro: empleadoRegistro || req.usuario.email, fecha: new Date() };
    const transRef = await db.collection('transaccionesDeuda').add(transData);
    await deudaRef.update({ saldo: nuevoSaldo, estado: nuevoEstado });
    res.status(201).json({ mensaje: 'Transaccion registrada', transaccion: { id: transRef.id, ...transData }, nuevoSaldo, estado: nuevoEstado });
  } catch (error) {
    console.error('Error registrar transaccion:', error);
    res.status(500).json({ error: 'Error al registrar transaccion' });
  }
});

// PUT /api/deuda/:deudaId
router.put('/:deudaId', verificarToken, async (req, res) => {
  try {
    const { deudaId } = req.params;
    const { estado } = req.body;
    const db = getDb();
    const deudaRef = db.collection('deudas').doc(deudaId);
    const deudaDoc = await deudaRef.get();
    if (!deudaDoc.exists) return res.status(404).json({ error: 'Deuda no encontrada' });
    await deudaRef.update({ estado });
    res.json({ mensaje: 'Deuda actualizada', deuda: { ...firestoreDoc(deudaDoc), estado } });
  } catch (error) {
    console.error('Error actualizar deuda:', error);
    res.status(500).json({ error: 'Error al actualizar deuda' });
  }
});

module.exports = router;
