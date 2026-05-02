const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  cantidad: { type: Number, default: 0 },
  precio: { type: Number, default: 0 },
  codigoBarras: String,
  categoria: String,
  proveedor: String,
  proveedorId: Number,
  stockMinimo: Number,
  precioCompra: Number,
  precioVenta: Number,
  margen: Number,
  ubicacion: String,
  descripcion: String,
  estado: { type: String, enum: ['activo', 'agotado', 'descontinuado'], default: 'activo' },
  imagen: String,
  fechaCreacion: { type: Date, default: Date.now },
  fechaActualizacion: Date
});

module.exports = mongoose.model('Producto', productoSchema);
