const mongoose = require('mongoose');

const parseAllowedOrigins = () => {
  const defaults = [
    'http://localhost:3002',
    'http://localhost:3001',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost'
  ];
  const fromEnv = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...defaults, ...fromEnv]));
};

const ALLOWED_ORIGINS = parseAllowedOrigins();
const isAllowedOrigin = (origin) => !origin || ALLOWED_ORIGINS.includes(origin);
const getAppUrl = () => (process.env.APP_URL || process.env.REACT_APP_API_URL || 'http://localhost:3002').replace(/\/$/, '');
const isMongoReady = () => mongoose.connection.readyState === 1;

module.exports = { ALLOWED_ORIGINS, isAllowedOrigin, getAppUrl, isMongoReady };
