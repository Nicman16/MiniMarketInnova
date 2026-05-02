const express = require('express');
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const { normalizeProducto } = require('../utils/normalize');
const { emit } = require('../socket/io');
const state = require('../state');

const router = express.Router();

const mongoListo = () => mongoose.connection.readyState === 1;

// GET /api/productos
router.get('/productos', async (req, res) => {
  try {
    if (mongoListo()) {
      const todos = await Producto.find().lean();
      return res.json(todos.map(normalizeProducto));
    }
    return res.json(state.productos.map(normalizeProducto));
  } catch (error) {
    console.error('Error /api/productos:', error);
    res.status(500).json({ error: 'No se pudieron obtener productos' });
  }
});

// GET /api/tienda/productos
router.get('/tienda/productos', async (req, res) => {
  try {
    const { categoria } = req.query;
    const filtro = categoria ? { categoria } : {};

    if (mongoListo()) {
      const result = await Producto.find(filtro).lean();
      return res.json(result.map(normalizeProducto));
    }

    const result = categoria ? state.productos.filter((p) => p.categoria === categoria) : state.productos;
    res.json(result.map(normalizeProducto));
  } catch (error) {
    console.error('Error /api/tienda/productos:', error);
    res.status(500).json({ error: 'No se pudieron obtener productos de tienda' });
  }
});

// POST /api/tienda/productos
router.post('/tienda/productos', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.nombre) return res.status(400).json({ error: 'Producto inválido' });

    if (mongoListo()) {
      const nuevo = await Producto.create({
        nombre: payload.nombre, cantidad: payload.cantidad || 0,
        precio: payload.precio || 0, codigoBarras: payload.codigoBarras || '',
        categoria: payload.categoria || '', imagen: payload.imagen || '',
        proveedor: payload.proveedor || '', stockMinimo: payload.stockMinimo || 0,
        precioCompra: payload.precioCompra || 0, precioVenta: payload.precioVenta || 0,
        margen: payload.margen || 0, ubicacion: payload.ubicacion || '',
        descripcion: payload.descripcion || '', estado: payload.estado || 'activo',
        fechaActualizacion: new Date()
      });
      state.productos = await Producto.find().lean();
      const productoNormalizado = normalizeProducto(nuevo);
      state.estadisticas.productosAgregados++;
      emit('producto-agregado', productoNormalizado);
      return res.status(201).json(productoNormalizado);
    }

    const nuevoProducto = { ...payload, id: Date.now(), fechaCreacion: new Date().toISOString(), ultimaActualizacion: new Date().toISOString() };
    state.productos.push(nuevoProducto);
    state.estadisticas.productosAgregados++;
    emit('producto-agregado', nuevoProducto);
    return res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error('Error POST /api/tienda/productos:', error);
    res.status(500).json({ error: 'No se pudo crear producto' });
  }
});

// PUT /api/tienda/productos/:id
router.put('/tienda/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cambios = req.body;

    if (mongoListo()) {
      const actualizado = await Producto.findByIdAndUpdate(
        id, { ...cambios, fechaActualizacion: new Date(), ultimaActualizacion: new Date().toISOString() },
        { new: true }
      );

      if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado' });

      state.productos = await Producto.find().lean();
      const productoNormalizado = normalizeProducto(actualizado);
      state.estadisticas.productosActualizados++;
      emit('producto-actualizado', productoNormalizado);
      return res.json(productoNormalizado);
    }

    const index = state.productos.findIndex((p) => `${p.id}` === `${id}`);
    if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });

    const actualizado = { ...state.productos[index], ...cambios, ultimaActualizacion: new Date().toISOString() };
    state.productos[index] = actualizado;
    state.estadisticas.productosActualizados++;
    emit('producto-actualizado', actualizado);
    return res.json(actualizado);
  } catch (error) {
    console.error('Error PUT /api/tienda/productos/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar producto' });
  }
});

module.exports = router;
