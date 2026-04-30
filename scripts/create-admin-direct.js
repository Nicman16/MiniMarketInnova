#!/usr/bin/env node

/**
 * Create Admin (Jefe) User — Direct Atlas Connection
 *
 * This script creates the primary jefe/administrator account directly in
 * MongoDB Atlas, bypassing the application server entirely.
 *
 * Usage:
 *   npm run create:admin
 *
 * IMPORTANT:
 * - Change the default password immediately after first login.
 * - This script is safe to run more than once — it will not create
 *   duplicate accounts if the email already exists.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Configuration ────────────────────────────────────────────────────────────

const MONGO_URI =
  'mongodb+srv://nicolasdani3ndrm_db_user:TrZjoGtsEgzr4muW@clustermarket.koz2xk3.mongodb.net/?appName=clustermarket';

const ADMIN_EMAIL    = 'nicolasdani3.ndrm@gmail.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NOMBRE   = 'Administrador';
const ADMIN_ROL      = 'jefe';
const ADMIN_ESTADO   = 'activo';

// ─── Schema (mirrors server.js) ───────────────────────────────────────────────

const usuarioSchema = new mongoose.Schema({
  nombre:                  { type: String, required: true },
  email:                   { type: String, required: true, unique: true },
  contraseña:              { type: String, required: true },
  pin:                     { type: String, unique: true, sparse: true },
  rol:                     { type: String, enum: ['jefe', 'empleado'], default: 'empleado' },
  estado:                  { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
  emailVerificado:         { type: Boolean, default: false },
  tokenVerificacionHash:   String,
  tokenVerificacionExpira: Date,
  fechaCreacion:           { type: Date, default: Date.now },
  ultimoAcceso:            Date
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

// ─── Main ──────────────────────────────────────────────────────────────────────

async function createAdmin() {
  const displayUri = MONGO_URI.replace(/\/\/.*@/, '//***:***@').split('?')[0];

  console.log('🔌 Conectando a MongoDB Atlas...');
  console.log('   URI:', displayUri);

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });

  console.log('✅ Conexión exitosa\n');

  // ── Check for existing user ──────────────────────────────────────────────────
  const existing = await Usuario.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    console.log('⚠️  El usuario ya existe en la base de datos:');
    console.log('   Email :', existing.email);
    console.log('   Nombre:', existing.nombre);
    console.log('   Rol   :', existing.rol);
    console.log('   Estado:', existing.estado);
    console.log('\nℹ️  No se realizaron cambios. Si necesitas restablecer la');
    console.log('   contraseña, usa la opción de recuperación en la aplicación.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Hash password & create user ──────────────────────────────────────────────
  console.log('🔐 Generando hash de contraseña...');
  const salt           = await bcrypt.genSalt(10);
  const contraseñaHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  const nuevoAdmin = await Usuario.create({
    nombre:          ADMIN_NOMBRE,
    email:           ADMIN_EMAIL,
    contraseña:      contraseñaHash,
    rol:             ADMIN_ROL,
    estado:          ADMIN_ESTADO,
    emailVerificado: true,
  });

  console.log('✅ Usuario jefe creado exitosamente:\n');
  console.log('   Email    :', nuevoAdmin.email);
  console.log('   Nombre   :', nuevoAdmin.nombre);
  console.log('   Rol      :', nuevoAdmin.rol);
  console.log('   Estado   :', nuevoAdmin.estado);
  console.log('   ID       :', nuevoAdmin._id.toString());
  console.log('\n⚠️  IMPORTANTE:');
  console.log('   - Contraseña inicial: Admin123!');
  console.log('   - Cambia la contraseña después del primer inicio de sesión.');
  console.log('   - No compartas estas credenciales.\n');

  await mongoose.disconnect();
  console.log('🔌 Conexión cerrada. ¡Listo!');
  process.exit(0);
}

createAdmin().catch(async (error) => {
  console.error('\n❌ Error al crear el usuario administrador:');
  console.error('  ', error.message);

  try {
    await mongoose.disconnect();
  } catch (_) {
    // no-op
  }

  process.exit(1);
});
