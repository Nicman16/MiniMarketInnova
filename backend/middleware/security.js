const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { isAllowedOrigin } = require('../config/env');

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      workerSrc: ["'self'", "blob:"],
    },
  },
});

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido por CORS: ${origin || 'N/A'}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
const corsMiddleware = cors(corsOptions);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Aumentado para facilitar pruebas
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

module.exports = { helmetMiddleware, corsMiddleware, corsOptions, generalLimiter, authLimiter };
