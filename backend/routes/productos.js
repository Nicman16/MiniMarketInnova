const express = require('express');
const { verificarToken } = require('../middleware/auth');
const { getDb, firestoreDoc, firestoreDocs } = require('../config/firebase');
const { normalizeProducto } = require('../utils/normalize');
const { emit } = require('../socket/io');
const state = require('../state');

const router = express.Router();

// GET /api/productos
router.get('/productos', verificarToken, async (req, res) => {
  try {
    const db = getDb();
    if (db) {
      const snap = await db.collection('productos').get();
      return res.json(firestoreDocs(snap).map(normalizeProducto));
    }
    res.json(state.productos.map(normalizeProducto));
  } catch (error) {
    console.error('Error /api/productos:', error);
    res.status(500).json({ error: 'No se pudieron obtener productos' });
  }
});

// GET /api/tienda/productos
router.get('/tienda/productos', verificarToken, async (req, res) => {
  try {
    const { categoria } = req.query;
    const db = getDb();
    if (db) {
      let query = db.collection('productos');
      if (categoria) query = query.where('categoria', '==', categoria);
      const snap = await query.get();
      return res.json(firestoreDocs(snap).map(normalizeProducto));
    }
    const result = categoria ? state.productos.filter((p) => p.categoria === categoria) : state.productos;
    res.json(result.map(normalizeProducto));
  } catch (error) {
    console.error('Error /api/tienda/productos:', error);
    res.status(500).json({ error: 'No se pudieron obtener productos de tienda' });
  }
});

// POST /api/tienda/productos
router.post('/tienda/productos', verificarToken, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    const db = getDb();
    if (db) {
      const codigoBarras = (payload.codigoBarras || '').toString().trim();
      const fechaVencimiento = payload.fechaVencimiento ? new Date(payload.fechaVencimiento) : null;
      const data = {
        nombre: payload.nombre, cantidad: payload.cantidad || 0,
        precio: payload.precio || 0, codigoBarras: codigoBarras,
        categoria: payload.categoria || '', imagen: payload.imagen || '',
        proveedor: payload.proveedor || '', stockMinimo: payload.stockMinimo || 0,
        precioCompra: payload.precioCompra || 0, precioVenta: payload.precioVenta || 0,
        margen: payload.margen || 0, ubicacion: payload.ubicacion || '',
        descripcion: payload.descripcion || '', estado: payload.estado || 'activo',
        fechaVencimiento,
        fechaActualizacion: new Date(),
        fechaCreacion: new Date()
      };

      let docRef;
      if (codigoBarras) {
        docRef = db.collection('productos').doc(codigoBarras);
        await docRef.set(data, { merge: true });
      } else {
        docRef = await db.collection('productos').add(data);
      }

      const saved = await docRef.get();
      const nuevo = firestoreDoc(saved);
      const snap = await db.collection('productos').get();
      state.productos = firestoreDocs(snap);
      const productoNormalizado = normalizeProducto(nuevo);
      state.estadisticas.productosAgregados++;
      emit('producto-agregado', productoNormalizado);
      return res.status(201).json(productoNormalizado);
    }

    const nuevo = { id: Date.now().toString(), ...payload, fechaActualizacion: new Date().toISOString() };
    state.productos.push(nuevo);
    const productoNormalizado = normalizeProducto(nuevo);
    state.estadisticas.productosAgregados++;
    emit('producto-agregado', productoNormalizado);
    res.status(201).json(productoNormalizado);
  } catch (error) {
    console.error('Error POST /api/tienda/productos:', error);
    res.status(500).json({ error: 'No se pudo agregar el producto' });
  }
});

// PUT /api/tienda/productos/:id
router.put('/tienda/productos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const cambios = req.body;
    const db = getDb();
    if (db) {
      const docRef = db.collection('productos').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return res.status(404).json({ error: 'Producto no encontrado' });
      await docRef.update({ ...cambios, fechaActualizacion: new Date() });
      const updatedSnap = await docRef.get();
      const actualizado = firestoreDoc(updatedSnap);
      const snap = await db.collection('productos').get();
      state.productos = firestoreDocs(snap);
      const productoNormalizado = normalizeProducto(actualizado);
      state.estadisticas.productosActualizados++;
      emit('producto-actualizado', productoNormalizado);
      return res.json(productoNormalizado);
    }

    const index = state.productos.findIndex((p) => `${p.id}` === `${id}`);
    if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });
    state.productos[index] = { ...state.productos[index], ...cambios, ultimaActualizacion: new Date().toISOString() };
    const productoNormalizado = normalizeProducto(state.productos[index]);
    state.estadisticas.productosActualizados++;
    emit('producto-actualizado', productoNormalizado);
    res.json(productoNormalizado);
  } catch (error) {
    console.error('Error PUT /api/tienda/productos/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el producto' });
  }
});

// DELETE /api/tienda/productos/:id
router.delete('/tienda/productos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    if (db) {
      const docRef = db.collection('productos').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return res.status(404).json({ error: 'Producto no encontrado' });
      await docRef.delete();
      const snap = await db.collection('productos').get();
      state.productos = firestoreDocs(snap);
      emit('producto-eliminado', { id });
      return res.json({ mensaje: 'Producto eliminado', id });
    }

    const index = state.productos.findIndex((p) => `${p.id}` === `${id}`);
    if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });
    state.productos.splice(index, 1);
    emit('producto-eliminado', { id });
    res.json({ mensaje: 'Producto eliminado', id });
  } catch (error) {
    console.error('Error DELETE /api/tienda/productos/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el producto' });
  }
});

module.exports = router;