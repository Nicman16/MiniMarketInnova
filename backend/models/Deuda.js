const mongoose = require('mongoose');

const deudaSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['cliente', 'empleado'], required: true },
  referencia: { type: String, required: true },
  nombrePersona: { type: String, required: true },
  monto: { type: Number, required: true },
  razon: String,
  fecha: { type: Date, default: Date.now },
  estado: { type: String, enum: ['pendiente', 'parcial', 'pagada'], default: 'pendiente' },
  saldo: { type: Number, required: true }
});

module.exports = mongoose.model('Deuda', deudaSchema);
