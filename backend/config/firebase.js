const admin = require('firebase-admin');
const path = require('path');

let _db = null;
let _ready = false;

const conectar = async (onConnected) => {
  try {
    const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    _db = admin.firestore();
    _ready = true;

    console.log('✅ Firebase Firestore conectado exitosamente');
    console.log(`📦 Proyecto: ${serviceAccount.project_id}`);

    if (onConnected) await onConnected();
  } catch (err) {
    console.error('❌ No se pudo conectar a Firebase:', err.message);
  }
};

const getDb = () => _db;
const isReady = () => _ready;

module.exports = { conectar, getDb, isReady };

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
