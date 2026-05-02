const mongoose = require('mongoose');

const ventaItemSchema = new mongoose.Schema({
  productoId: { type: String, required: true },
  nombre: { type: String, required: true },
  codigoBarras: String,
  categoria: String,
  cantidad: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
  subtotal: { type: Number, required: true }
}, { _id: false });

const ventaSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  items: { type: [ventaItemSchema], required: true },
  subtotal: { type: Number, required: true },
  iva: { type: Number, default: 0 },
  descuentos: { type: Number, default: 0 },
  total: { type: Number, required: true },
  metodoPago: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia'], required: true },
  vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  vendedorNombre: { type: String, required: true },
  vendedorEmail: { type: String, required: true },
  vendedorRol: { type: String, enum: ['jefe', 'empleado'], required: true },
  estado: { type: String, enum: ['completada', 'cancelada'], default: 'completada' }
});

module.exports = mongoose.model('Venta', ventaSchema);
