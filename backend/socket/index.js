const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const { normalizeProducto } = require('../utils/normalize');
const state = require('../state');

// Configura todos los eventos de Socket.IO
const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('📱 Dispositivo conectado:', socket.id);
    state.dispositivosConectados.push({
      id: socket.id,
      conectadoEn: new Date().toISOString(),
      userAgent: socket.handshake.headers['user-agent'] || 'Unknown'
    });

    socket.emit('productos-sync', state.productos);
    socket.emit('dispositivos-conectados', state.dispositivosConectados.length);
    io.emit('dispositivo-conectado', state.dispositivosConectados.length);

    // ── Agregar producto ──────────────────────────────────────────
    socket.on('agregar-producto', async (producto) => {
      try {
        if (!producto?.nombre) return;
        let nuevo = { ...producto, id: Date.now(), fechaCreacion: new Date().toISOString(), modificado: true };

        if (mongoose.connection.readyState === 1) {
          const doc = await Producto.create({
            nombre: producto.nombre, cantidad: producto.cantidad || 0,
            precio: producto.precio || 0, codigoBarras: producto.codigoBarras || '',
            categoria: producto.categoria || '', imagen: producto.imagen || ''
          });
          nuevo = doc.toObject();
        }

        state.productos.push(nuevo);
        state.estadisticas.productosAgregados++;
        io.emit('producto-agregado', nuevo);
      } catch (err) {
        console.error('Error agregando producto:', err);
        socket.emit('error', 'Error al agregar producto');
      }
    });

    // ── Actualizar producto ───────────────────────────────────────
    socket.on('actualizar-producto', async (producto) => {
      try {
        const index = state.productos.findIndex((p) => p.id === producto.id);
        if (index === -1) return;
        const actualizado = { ...producto, fechaActualizacion: new Date().toISOString(), modificado: true };
        state.productos[index] = actualizado;

        if (mongoose.connection.readyState === 1) {
          await Producto.findOneAndUpdate(
            { _id: producto._id || producto.id },
            { nombre: producto.nombre, cantidad: producto.cantidad, precio: producto.precio,
              codigoBarras: producto.codigoBarras, categoria: producto.categoria, imagen: producto.imagen,
              fechaActualizacion: new Date() },
            { new: true, upsert: false }
          );
        }

        state.estadisticas.productosActualizados++;
        io.emit('producto-actualizado', actualizado);
      } catch (err) {
        console.error('Error actualizando producto:', err);
        socket.emit('error', 'Error al actualizar producto');
      }
    });

    // ── Eliminar producto ─────────────────────────────────────────
    socket.on('eliminar-producto', async (id) => {
      try {
        state.productos = state.productos.filter((p) => p.id !== id);
        if (mongoose.connection.readyState === 1) {
          await Producto.findByIdAndDelete(id).catch(() => null);
        }
        io.emit('producto-eliminado', id);
      } catch (err) {
        console.error('Error eliminando producto:', err);
        socket.emit('error', 'Error al eliminar producto');
      }
    });

    // ── Código escaneado ──────────────────────────────────────────
    socket.on('codigo-escaneado', (data) => {
      try {
        state.estadisticas.escaneos++;
        socket.broadcast.emit('codigo-escaneado', { ...data, timestamp: new Date().toISOString() });
      } catch (err) {
        console.error('Error procesando código:', err);
      }
    });

    socket.on('ping', () => socket.emit('pong'));

    // ── Desconexión ───────────────────────────────────────────────
    socket.on('disconnect', () => {
      state.dispositivosConectados = state.dispositivosConectados.filter((d) => d.id !== socket.id);
      console.log('📴 Dispositivo desconectado:', socket.id);
      io.emit('dispositivo-desconectado', state.dispositivosConectados.length);

      if (process.env.NODE_ENV !== 'production' && state.dispositivosConectados.length === 0) {
        console.log('😴 Sin conexiones activas. Cerrando servidor automáticamente.');
        setTimeout(() => { if (state.dispositivosConectados.length === 0) process.exit(0); }, 1000);
      }
    });
  });
};

module.exports = { setupSocket };
