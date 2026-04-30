#!/usr/bin/env node

/**
 * Seed Script — Admin (Jefe) User
 *
 * Creates the initial jefe user so the owner can log in and manage the system.
 * Safe to run multiple times — skips creation if the email already exists.
 *
 * Usage:
 *   npm run seed:admin
 *
 * The default password is "Admin123!" — change it immediately after first login.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/minimarket';

const ADMIN_EMAIL    = 'nicolasdani3.ndrm@gmail.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NOMBRE   = 'Administrador';

// Mirror the schema defined in server.js
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
  ultimoAcceso:            Date,
});

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);

async function seedAdmin() {
  console.log('🔌 Connecting to MongoDB...');
  console.log('   URI:', MONGO_URI.replace(/\/\/.*@/, '//***:***@').split('?')[0]);

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  console.log('✅ Connected to MongoDB\n');

  // Check if the user already exists
  const existing = await Usuario.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`⚠️  User already exists: ${ADMIN_EMAIL}`);
    console.log('   No changes were made.');
    console.log('   If you need to reset the password, use the "Forgot password" flow or run:');
    console.log('   npm run setup:admin -- --email=<email> --password=<new_password>\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Hash the default password
  const salt = await bcrypt.genSalt(10);
  const contraseñaHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  // Create the admin user
  await Usuario.create({
    nombre:          ADMIN_NOMBRE,
    email:           ADMIN_EMAIL,
    contraseña:      contraseñaHash,
    rol:             'jefe',
    estado:          'activo',
    emailVerificado: true,   // pre-verified so login works immediately
  });

  console.log('✅ Admin (jefe) user created successfully!\n');
  console.log('📋 Credentials:');
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role    : jefe`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the password immediately after your first login.\n');

  await mongoose.disconnect();
  console.log('✨ Done.');
  process.exit(0);
}

seedAdmin().catch(async (error) => {
  console.error('❌ Error creating admin user:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect errors
  }
  process.exit(1);
});
