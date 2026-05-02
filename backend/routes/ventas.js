const express = require('express');
const mongoose = require('mongoose');
const { verificarToken } = require('../middleware/auth');
const { isMongoReady } = require('../config/env');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const SesionCaja = require('../models/SesionCaja');
const Usuario = require('../models/Usuario');
const { normalizeVenta, normalizeProducto } = require('../utils/normalize');
const { emit } = require('../socket/io');
const state = require('../state');

const router = express.Router();

// POST /api/ventas
router.post('/', verificarToken, async (req, res) => {
  try {
    const { items, subtotal, iva, descuentos, total, metodoPago } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe incluir al menos un producto' });
    }

    if (!['efectivo', 'tarjeta', 'transferencia'].includes(metodoPago)) {
      return res.status(400).json({ error: 'Método de pago inválido' });
    }

    const vendedor = await Usuario.findById(req.usuario.id);
    if (!vendedor) return res.status(404).json({ error: 'Empleado no encontrado' });

    const itemsNormalizados = [];
    const productosMongoActualizados = [];
    const productosMemoriaActualizados = [];

    for (const item of items) {
      const productoId = String(item.productoId || item.producto?.id || '');
      const cantidad = Number(item.cantidad || 0);

      if (!productoId || cantidad <= 0) {
        return res.status(400).json({ error: 'Hay productos inválidos en la venta' });
      }

      if (isMongoReady()) {
        const producto = await Producto.findById(productoId);
        if (!producto) return res.status(404).json({ error: 'Uno de los productos ya no existe' });

        const stockActual = Number(producto.cantidad || 0);
        if (stockActual < cantidad) return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });

        const precioUnitario = Number(item.precioUnitario || producto.precioVenta || producto.precio || 0);
        itemsNormalizados.push({ productoId, nombre: producto.nombre, codigoBarras: producto.codigoBarras || '', categoria: producto.categoria || '', cantidad, precioUnitario, subtotal: Number(item.subtotal || cantidad * precioUnitario) });
        productosMongoActualizados.push({ producto, nuevaCantidad: stockActual - cantidad });
      } else {
        const index = state.productos.findIndex((p) => `${p.id}` === productoId);
        if (index === -1) return res.status(404).json({ error: 'Uno de los productos ya no existe' });

        const producto = state.productos[index];
        const stockActual = Number(producto.cantidad || 0);
        if (stockActual < cantidad) return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });

        const precioUnitario = Number(item.precioUnitario || producto.precioVenta || producto.precio || 0);
        itemsNormalizados.push({ productoId, nombre: producto.nombre, codigoBarras: producto.codigoBarras || '', categoria: producto.categoria || '', cantidad, precioUnitario, subtotal: Number(item.subtotal || cantidad * precioUnitario) });
        productosMemoriaActualizados.push({ index, producto, nuevaCantidad: stockActual - cantidad });
      }
    }

    const ventaPayload = {
      fecha: new Date(), items: itemsNormalizados,
      subtotal: Number(subtotal || itemsNormalizados.reduce((sum, i) => sum + i.subtotal, 0)),
      iva: Number(iva || 0), descuentos: Number(descuentos || 0),
      total: Number(total || 0), metodoPago,
      vendedorId: vendedor._id, vendedorNombre: vendedor.nombre,
      vendedorEmail: vendedor.email, vendedorRol: vendedor.rol, estado: 'completada'
    };

    if (ventaPayload.total <= 0) return res.status(400).json({ error: 'El total de la venta debe ser mayor a cero' });

    if (isMongoReady()) {
      for (const { producto, nuevaCantidad } of productosMongoActualizados) {
        producto.cantidad = nuevaCantidad;
        producto.fechaActualizacion = new Date();
        await producto.save();
        emit('producto-actualizado', normalizeProducto(producto));
      }
    } else {
      productosMemoriaActualizados.forEach(({ index, producto, nuevaCantidad }) => {
        state.productos[index] = { ...producto, cantidad: nuevaCantidad, ultimaActualizacion: new Date().toISOString() };
        emit('producto-actualizado', normalizeProducto(state.productos[index]));
      });
    }

    let ventaRegistrada;
    if (isMongoReady()) {
      ventaRegistrada = await Venta.create(ventaPayload);
      const sesionActiva = await SesionCaja.findOne({ estado: 'abierta' }).sort({ fechaApertura: -1 });
      if (sesionActiva) {
        if (metodoPago === 'efectivo') sesionActiva.ventasEfectivo += ventaPayload.total;
        else if (metodoPago === 'tarjeta') sesionActiva.ventasTarjeta += ventaPayload.total;
        else sesionActiva.ventasTransferencia += ventaPayload.total;
        await sesionActiva.save();
      }
    } else {
      ventaRegistrada = { ...ventaPayload, id: Date.now().toString(), _id: Date.now().toString() };
      state.ventasRegistradas.unshift(ventaRegistrada);
    }

    const ventaNormalizada = normalizeVenta(ventaRegistrada);
    emit('venta-registrada', ventaNormalizada);
    res.status(201).json(ventaNormalizada);
  } catch (error) {
    console.error('Error POST /api/ventas:', error);
    res.status(500).json({ error: 'No se pudo registrar la venta' });
  }
});

module.exports = router;
