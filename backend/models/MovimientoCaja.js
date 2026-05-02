const mongoose = require('mongoose');

const movimientoCajaSchema = new mongoose.Schema({
  sesionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SesionCaja', required: true },
  tipo: { type: String, enum: ['ingreso', 'egreso', 'venta'], required: true },
  monto: { type: Number, required: true },
  concepto: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  empleadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  empleadoNombre: { type: String, required: true },
  empleadoEmail: { type: String, required: true },
  empleadoRol: { type: String, enum: ['jefe', 'empleado'], required: true }
});

module.exports = mongoose.model('MovimientoCaja', movimientoCajaSchema);
