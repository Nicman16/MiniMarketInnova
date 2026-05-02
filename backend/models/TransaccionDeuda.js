const mongoose = require('mongoose');

const transaccionDeudaSchema = new mongoose.Schema({
  deudaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deuda', required: true },
  tipo: { type: String, enum: ['cargo', 'abono'], required: true },
  monto: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  razon: String,
  empleadoRegistro: String,
  comprobante: {
    foto: String,
    descripcion: String,
    tipoComprobante: { type: String, enum: ['foto_pago', 'recibo', 'ticket'] }
  }
});

module.exports = mongoose.model('TransaccionDeuda', transaccionDeudaSchema);
