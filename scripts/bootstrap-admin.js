require('dotenv').config();
const path = require('path');
const admin = require('firebase-admin');
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

if (!email || !password) {
  console.error('Uso: npm run setup:admin -- --email=tu_correo --password=tu_clave [--nombre=Tu Nombre]');
  process.exit(1);
}

async function main() {
  const keyPath = path.join(__dirname, '..', 'backend', 'serviceAccountKey.json');
  const serviceAccount = require(keyPath);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  const salt = await bcrypt.genSalt(10);
  const contraseñaHash = await bcrypt.hash(password, salt);

  const snap = await db.collection('usuarios').where('email', '==', email).limit(1).get();

  if (!snap.empty) {
    const docRef = snap.docs[0].ref;
    await docRef.update({
      nombre, contraseña: contraseñaHash, rol: 'jefe', estado: 'activo',
      emailVerificado: true, tokenVerificacionHash: null, tokenVerificacionExpira: null
    });

    let authUser;
    try {
      authUser = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(authUser.uid, {
        displayName: nombre,
        password,
        emailVerified: true,
        disabled: false
      });
    } catch (error) {
      if (error && error.code === 'auth/user-not-found') {
        authUser = await admin.auth().createUser({
          email,
          password,
          displayName: nombre,
          emailVerified: true,
          disabled: false
        });
      } else {
        throw error;
      }
    }

    await docRef.update({ firebaseUid: authUser.uid });
    console.log(`✅ Jefe actualizado: ${email}`);
  } else {
    const authUser = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
      emailVerified: true,
      disabled: false
    });

    await db.collection('usuarios').add({
      nombre, email, contraseña: contraseñaHash, pin: null,
      firebaseUid: authUser.uid,
      rol: 'jefe', estado: 'activo', emailVerificado: true,
      tokenVerificacionHash: null, tokenVerificacionExpira: null,
      fechaCreacion: new Date(), ultimoAcceso: null
    });
    console.log(`✅ Jefe creado: ${email}`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error configurando jefe principal:', error);
  process.exit(1);
});