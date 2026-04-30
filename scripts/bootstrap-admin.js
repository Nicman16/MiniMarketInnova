require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
const readArg = (name, fallback = '') => {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const email = readArg('email', process.env.INITIAL_ADMIN_EMAIL || '').trim();
const password = readArg('password', process.env.INITIAL_ADMIN_PASSWORD || '').trim();
const nombre = readArg('nombre', process.env.INITIAL_ADMIN_NAME || 'Administrador Principal').trim();
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/minimarket';

if (!email || !password) {
  console.error('Uso: npm run setup:admin -- --email=tu_correo --password=tu_clave [--nombre=Tu Nombre]');
  process.exit(1);
}

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

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);

async function main() {
  await mongoose.connect(mongoUri);
  const salt = await bcrypt.genSalt(10);
  const contraseñaHash = await bcrypt.hash(password, salt);

  const usuario = await Usuario.findOneAndUpdate(
    { email },
    {
      nombre,
      email,
      contraseña: contraseñaHash,
      rol: 'jefe',
      estado: 'activo',
      emailVerificado: true,
      tokenVerificacionHash: undefined,
      tokenVerificacionExpira: undefined
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log(`✅ Jefe principal listo: ${usuario.email}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('❌ Error configurando jefe principal:', error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // no-op
  }
  process.exit(1);
});