const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/minimarket';
const DISPLAY_URI = MONGO_URI.replace(/:\/\/.*@/, '://***:***@').split('?')[0];

const conectar = async (onConnected) => {
  console.log('🔍 Intentando conectar a MongoDB:', DISPLAY_URI);
  console.log('📍 Entorno:', process.env.NODE_ENV);

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB conectado exitosamente');
    if (onConnected) await onConnected();
  } catch (err) {
    console.warn('⚠️ No se pudo conectar a MongoDB:', err.message);
    console.warn('💡 Para Railway: verifica que el servicio MongoDB esté configurado');
  }
};

module.exports = { conectar };
