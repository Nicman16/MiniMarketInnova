const express = require('express');
const { verificarToken } = require('../middleware/auth');
const { getDb, firestoreDoc } = require('../config/firebase');
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

    if (!['efectivo', 'nequi', 'datafono'].includes(metodoPago)) {
      return res.status(400).json({ error: 'Método de pago inválido' });
    }

    const db = getDb();

    if (!db) {
      // Fallback en memoria
      const itemsNormalizados = [];
      for (const item of items) {
        const productoId = String(item.productoId || item.producto?.id || '');
        const cantidad = Number(item.cantidad || 0);
        if (!productoId || cantidad <= 0) return res.status(400).json({ error: 'Hay productos inválidos en la venta' });
        const index = state.productos.findIndex((p) => `${p.id}` === productoId);
        if (index === -1) return res.status(404).json({ error: 'Uno de los productos ya no existe' });
        const producto = state.productos[index];
        if (Number(producto.cantidad || 0) < cantidad) return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });
        const precioUnitario = Number(item.precioUnitario || producto.precioVenta || producto.precio || 0);
        itemsNormalizados.push({ productoId, nombre: producto.nombre, cantidad, precioUnitario, subtotal: Number(item.subtotal || cantidad * precioUnitario) });
        state.productos[index] = { ...producto, cantidad: producto.cantidad - cantidad };
      }
      const ventaRegistrada = { id: Date.now().toString(), fecha: new Date(), items: itemsNormalizados, subtotal: Number(subtotal || 0), iva: Number(iva || 0), descuentos: Number(descuentos || 0), total: Number(total || 0), metodoPago, estado: 'completada' };
      state.ventasRegistradas.unshift(ventaRegistrada);
      emit('venta-registrada', ventaRegistrada);
      return res.status(201).json(ventaRegistrada);
    }

    // Firestore: obtener vendedor
    const vendedorDoc = await db.collection('usuarios').doc(req.usuario.id).get();
    if (!vendedorDoc.exists) return res.status(404).json({ error: 'Empleado no encontrado' });
    const vendedor = firestoreDoc(vendedorDoc);

    const totalVenta = Number(total || 0);
    if (totalVenta <= 0) return res.status(400).json({ error: 'El total de la venta debe ser mayor a cero' });

    // Validar stock fuera de transacción
    const itemsNormalizados = [];
    for (const item of items) {
      const productoId = String(item.productoId || item.producto?.id || '');
      const cantidad = Number(item.cantidad || 0);
      if (!productoId || cantidad <= 0) return res.status(400).json({ error: 'Hay productos inválidos en la venta' });
      const prodDoc = await db.collection('productos').doc(productoId).get();
      if (!prodDoc.exists) return res.status(404).json({ error: 'Uno de los productos ya no existe' });
      const producto = firestoreDoc(prodDoc);
      if (Number(producto.cantidad || 0) < cantidad) return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });
      const precioUnitario = Number(item.precioUnitario || producto.precioVenta || producto.precio || 0);
      itemsNormalizados.push({ productoId, nombre: producto.nombre, codigoBarras: producto.codigoBarras || '', categoria: producto.categoria || '', cantidad, precioUnitario, subtotal: Number(item.subtotal || cantidad * precioUnitario) });
    }

    // Ejecutar como transacción Firestore
    let ventaId;
    await db.runTransaction(async (t) => {
      // Descontar stock
      for (const item of itemsNormalizados) {
        const prodRef = db.collection('productos').doc(item.productoId);
        const prodDoc = await t.get(prodRef);
        const stockActual = Number(prodDoc.data().cantidad || 0);
        t.update(prodRef, { cantidad: stockActual - item.cantidad, fechaActualizacion: new Date() });
      }

      // Registrar venta
      const ventaRef = db.collection('ventas').doc();
      ventaId = ventaRef.id;
      t.set(ventaRef, {
        fecha: new Date(), items: itemsNormalizados,
        subtotal: Number(subtotal || 0), iva: Number(iva || 0),
        descuentos: Number(descuentos || 0), total: totalVenta, metodoPago,
        vendedorId: vendedor.id, vendedorNombre: vendedor.nombre,
        vendedorEmail: vendedor.email, vendedorRol: vendedor.rol, estado: 'completada'
      });

      // Actualizar sesión de caja activa
      const sesionSnap = await db.collection('sesionCaja').where('estado', '==', 'abierta').limit(1).get();
      if (!sesionSnap.empty) {
        const sesionRef = sesionSnap.docs[0].ref;
        const campo = metodoPago === 'efectivo' ? 'ventasEfectivo' : metodoPago === 'tarjeta' ? 'ventasTarjeta' : 'ventasTransferencia';
        const valorActual = Number(sesionSnap.docs[0].data()[campo] || 0);
        t.update(sesionRef, { [campo]: valorActual + totalVenta });
      }
    });

    // Actualizar state con nuevos stocks
    for (const item of itemsNormalizados) {
      const idx = state.productos.findIndex((p) => `${p.id}` === item.productoId);
      if (idx !== -1) {
        state.productos[idx] = { ...state.productos[idx], cantidad: state.productos[idx].cantidad - item.cantidad };
        emit('producto-actualizado', normalizeProducto(state.productos[idx]));
      }
    }

    const ventaRegistrada = { id: ventaId, fecha: new Date(), items: itemsNormalizados, subtotal: Number(subtotal || 0), iva: Number(iva || 0), descuentos: Number(descuentos || 0), total: totalVenta, metodoPago, vendedorId: vendedor.id, vendedorNombre: vendedor.nombre, estado: 'completada' };
    emit('venta-registrada', ventaRegistrada);
    res.status(201).json(ventaRegistrada);
  } catch (error) {
    console.error('Error POST /api/ventas:', error);
    res.status(500).json({ error: 'No se pudo registrar la venta' });
  }
});

module.exports = router;
