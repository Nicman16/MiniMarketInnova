const mongoose = require('mongoose');

const sesionCajaSchema = new mongoose.Schema({
  empleadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  empleadoNombre: { type: String, required: true },
  empleadoEmail: { type: String, required: true },
  empleadoRol: { type: String, enum: ['jefe', 'empleado'], required: true },
  fechaApertura: { type: Date, default: Date.now },
  fechaCierre: Date,
  montoApertura: { type: Number, required: true },
  montoCierre: Number,
  ventasEfectivo: { type: Number, default: 0 },
  ventasTarjeta: { type: Number, default: 0 },
  ventasTransferencia: { type: Number, default: 0 },
  ingresos: { type: Number, default: 0 },
  egresos: { type: Number, default: 0 },
  estado: { type: String, enum: ['abierta', 'cerrada'], default: 'abierta' }
});

module.exports = mongoose.model('SesionCaja', sesionCajaSchema);
