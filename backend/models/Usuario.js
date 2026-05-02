const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  pin: { type: String, unique: true, sparse: true },
  rol: { type: String, enum: ['jefe', 'empleado'], default: 'empleado' },
  estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
  emailVerificado: { type: Boolean, default: false },
  tokenVerificacionHash: String,
  tokenVerificacionExpira: Date,
  fechaCreacion: { type: Date, default: Date.now },
  ultimoAcceso: Date
});

module.exports = mongoose.model('Usuario', usuarioSchema);
