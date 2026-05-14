const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let _db = null;
let _ready = false;

const cargarCredencial = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return JSON.parse(json);
  }

  const keyPath = path.join(__dirname, '../serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    return require(keyPath);
  }

  throw new Error('No se encontro credencial de Firebase. Define FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_BASE64, o agrega backend/serviceAccountKey.json');
};

const conectar = async (onConnected) => {
  try {
    const serviceAccount = cargarCredencial();

    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }

    _db = admin.firestore();
    _ready = true;

    console.log('✅ Firebase Firestore conectado exitosamente');
    console.log(`📦 Proyecto: ${serviceAccount.project_id}`);

    if (onConnected) await onConnected();
  } catch (err) {
    _ready = false;
    console.error('❌ No se pudo conectar a Firebase:', err.message);
  }
};

const getDb = () => _db;
const isReady = () => _ready;

// Convierte un documento Firestore a objeto plano (Timestamps → ISO strings)
const firestoreDoc = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  const obj = {};
  for (const [k, v] of Object.entries(data)) {
    obj[k] = v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v;
  }
  return { id: doc.id, ...obj };
};

// Convierte un QuerySnapshot a array de objetos planos
const firestoreDocs = (snapshot) => snapshot.docs.map(firestoreDoc);

module.exports = { conectar, getDb, isReady, firestoreDoc, firestoreDocs };
