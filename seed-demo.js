#!/usr/bin/env node

/**
 * Seed Script for Demo Data
 * 
 * This script creates demo users for development purposes only.
 * Run this ONLY in development environment.
 * 
 * Usage:
 *   npm run seed:demo
 * 
 * SECURITY WARNING:
 * - Never run this in production
 * - Only use for local development
 * - Change credentials before any real usage
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/minimarket';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security check
if (NODE_ENV === 'production') {
  console.error('❌ SECURITY ERROR: Cannot run seed script in production environment!');
  console.error('If you need to seed production data, please do it manually with proper authorization.');
  process.exit(1);
}

// Define schemas
const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  rol: { type: String, enum: ['jefe', 'empleado'], default: 'empleado' },
  estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
  fechaCreacion: { type: Date, default: Date.now },
  ultimoAcceso: Date
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

const demoUsers = [
  {
    nombre: 'Jefe de Tienda Demo',
    email: 'jefe@demo.local',
    rol: 'jefe',
    estado: 'activo',
    temporalPassword: 'DemoJefe2024!'
  },
  {
    nombre: 'Empleado Demo 1',
    email: 'empleado1@demo.local',
    rol: 'empleado',
    estado: 'activo',
    temporalPassword: 'DemoEmpleado2024!'
  },
  {
    nombre: 'Empleado Demo 2',
    email: 'empleado2@demo.local',
    rol: 'empleado',
    estado: 'activo',
    temporalPassword: 'DemoEmpleado2024!'
  }
];

async function seedDemo() {
  try {
    console.log('🌱 Starting demo data seeding...');
    console.log('📍 Environment:', NODE_ENV);
    console.log('🔌 Connecting to MongoDB:', MONGO_URI.replace(/:\/\/.*@/, '://***:***@').split('?')[0]);

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log('✅ Connected to MongoDB');

    // Check if demo users already exist
    const existingCount = await Usuario.countDocuments({ 
      email: { $in: demoUsers.map(u => u.email) } 
    });

    if (existingCount > 0) {
      console.warn('⚠️ Some demo users already exist. Skipping creation to avoid duplicates.');
      console.log('To reset, run: npm run seed:clean-demo');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create demo users with hashed passwords
    const salt = await bcrypt.genSalt(10);
    const usuariosConHash = await Promise.all(
      demoUsers.map(async (user) => ({
        ...user,
        contraseña: await bcrypt.hash(user.temporalPassword, salt)
      }))
    );

    const createdUsers = await Usuario.insertMany(
      usuariosConHash.map(({ temporalPassword, ...rest }) => rest)
    );

    console.log('\n✅ Demo users created successfully!\n');
    console.log('📋 Created users:');
    demoUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      Name: ${user.nombre}`);
      console.log(`      Role: ${user.rol}`);
      console.log(`      Status: ${user.estado}`);
      console.log(`      Temporary Password: ${user.temporalPassword}`);
      console.log('');
    });

    console.log('⚠️  IMPORTANT:');
    console.log('   - These are temporary demo credentials for development only');
    console.log('   - Change passwords on first login in production');
    console.log('   - Never commit these credentials to version control');
    console.log('   - To clean up demo users, run: npm run seed:clean-demo\n');

    await mongoose.disconnect();
    console.log('✨ Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error.message);
    process.exit(1);
  }
}

// Run the seed
seedDemo();
