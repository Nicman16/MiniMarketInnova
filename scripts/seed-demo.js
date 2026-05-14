#!/usr/bin/env node

/**
 * Script de siembra de datos demo
 * 
 * Crea usuarios de prueba en Firestore para entorno de desarrollo.
 * Ejecutar únicamente en desarrollo.
 * 
 * Uso:
 *   npm run seed:demo
 * 
 * ADVERTENCIA DE SEGURIDAD:
 * - No ejecutar en producción
 * - Solo para desarrollo local
 * - Cambiar credenciales antes de cualquier uso real
 */

require('dotenv').config();
const path = require('path');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const NODE_ENV = process.env.NODE_ENV || 'development';

// Verificación de seguridad
if (NODE_ENV === 'production' && process.env.FORCE_SEED !== 'true') {
  console.error('❌ ERROR DE SEGURIDAD: No se puede ejecutar el script de siembra en producción!');
  console.error('Si es necesario sembrar datos en producción, hacerlo manualmente con la autorización adecuada.');
  process.exit(1);
}

// ── Cargar credencial de Firebase ──────────────────────────────────────────
const cargarCredencial = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return JSON.parse(json);
  }

  const keyPath = path.join(__dirname, '..', 'backend', 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    return require(keyPath);
  }

  throw new Error('No se encontro credencial de Firebase. Define FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_BASE64, o crea backend/serviceAccountKey.json');
};

const demoUsers = [
  {
    nombre: 'Jefe de Tienda Demo',
    email: 'jefe@demo.local',
    rol: 'jefe',
    estado: 'activo',
    emailVerificado: true,
    temporalPassword: 'DemoJefe2024!'
  },
  {
    nombre: 'Empleado Demo 1',
    email: 'empleado1@demo.local',
    rol: 'empleado',
    estado: 'activo',
    emailVerificado: true,
    temporalPassword: 'DemoEmpleado2024!'
  },
  {
    nombre: 'Empleado Demo 2',
    email: 'empleado2@demo.local',
    rol: 'empleado',
    estado: 'activo',
    emailVerificado: true,
    temporalPassword: 'DemoEmpleado2024!'
  }
];

async function seedDemo() {
  try {
    console.log('🌱 Sembrando datos demo...');
    console.log('📍 Entorno:', NODE_ENV);
    console.log('🔌 Conectando a Firestore...\n');

    const serviceAccount = cargarCredencial();

    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    const db = admin.firestore();

    console.log(`✅ Conectado a Firestore (proyecto: ${serviceAccount.project_id})`);

    // Verificar si los usuarios demo ya existen
    const emailsDemo = demoUsers.map(u => u.email);
    const existingSnap = await db.collection('usuarios')
      .where('email', 'in', emailsDemo)
      .get();

    if (!existingSnap.empty) {
      console.warn('⚠️ Algunos usuarios demo ya existen. Omitiendo creación para evitar duplicados.');
      console.log('Para resetear, elimina manualmente los usuarios de la colección "usuarios" en Firestore.');
      process.exit(0);
    }

    // Crear usuarios demo con contraseñas hasheadas
    const salt = await bcrypt.genSalt(10);

    for (const user of demoUsers) {
      const contraseñaHash = await bcrypt.hash(user.temporalPassword, salt);

      // Crear en Firebase Authentication (opcional, no bloqueante para el login)
      let firebaseUid = null;
      try {
        const authUser = await admin.auth().createUser({
          email: user.email,
          password: user.temporalPassword,
          displayName: user.nombre,
          emailVerified: true,
          disabled: false
        });
        firebaseUid = authUser.uid;
      } catch (authErr) {
        // Si falla (ej: usuario ya existe en Auth), se continúa igual
        if (authErr.code !== 'auth/email-already-exists') {
          console.warn(`⚠️ No se pudo crear en Firebase Auth: ${authErr.message}`);
        }
      }

      // Crear documento en Firestore colección "usuarios"
      await db.collection('usuarios').add({
        nombre: user.nombre,
        email: user.email,
        contraseña: contraseñaHash,
        rol: user.rol,
        estado: user.estado,
        emailVerificado: true,
        pin: null,
        firebaseUid: firebaseUid || null,
        tokenVerificacionHash: null,
        tokenVerificacionExpira: null,
        fechaCreacion: new Date(),
        ultimoAcceso: null
      });

      console.log(`   ✅ ${user.email} (${user.rol}) — Creado`);
    }

    console.log('\n✅ Usuarios demo creados exitosamente en Firestore!\n');
    console.log('📋 Credenciales de prueba:');
    demoUsers.forEach((user) => {
      console.log(`   • ${user.email} — Contraseña: ${user.temporalPassword} (${user.rol})`);
    });

    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Son credenciales temporales solo para desarrollo');
    console.log('   - En producción usa bootstrap-admin.js para crear el administrador');
    console.log('   - Para limpiar, elimina los documentos de la colección "usuarios" en Firestore\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error sembrando datos demo:', error.message);
    process.exit(1);
  }
}

// Ejecutar
seedDemo();
