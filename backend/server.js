require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const { ALLOWED_ORIGINS, isAllowedOrigin } = require('./config/env');
const db = require('./config/db');
const state = require('./state');
const { setIo } = require('./socket/io');
const { setupSocket } = require('./socket/index');

const { helmetMiddleware, corsMiddleware, generalLimiter } = require('./middleware/security');

const authRoutes = require('./routes/auth');
const empleadosRoutes = require('./routes/empleados');
const cajaRoutes = require('./routes/caja');
const fiadoRoutes = require('./routes/fiado');
const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const statsRoutes = require('./routes/stats');
const reportesRoutes = require('./routes/reportes');

const Producto = require('./models/Producto');

const app = express();
const server = http.createServer(app);

console.log('🌐 CORS habilitado para orígenes:', ALLOWED_ORIGINS.join(', '));

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`Origen no permitido por CORS: ${origin || 'N/A'}`));
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});
setIo(io);
setupSocket(io);

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.options('*', corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(generalLimiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    dispositivos: state.dispositivosConectados.length,
    productos: state.productos.length,
    estadisticas: state.estadisticas
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/deuda', fiadoRoutes);
app.use('/api', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reportes', reportesRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
  });
} else {
  try {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    app.use('/', createProxyMiddleware({ target: 'http://localhost:3002', changeOrigin: true, ws: true, logLevel: 'silent' }));
    console.log('Proxy activo: / -> http://localhost:3002');
  } catch {
    app.get('/', (req, res) => res.redirect('http://localhost:3002'));
  }
}

const inicializarProductosBD = async () => {
  try {
    const count = await Producto.countDocuments();
    if (count === 0) {
      const semilla = [
        { nombre: 'Arroz Diana 500g', cantidad: 50, precio: 2500, codigoBarras: '7702001001234', categoria: 'Granos' },
        { nombre: 'Aceite Gourmet 1L', cantidad: 30, precio: 4500, codigoBarras: '7702002001235', categoria: 'Aceites' },
        { nombre: 'Azúcar Incauca 1kg', cantidad: 25, precio: 3200, codigoBarras: '7702003001236', categoria: 'Dulces' }
      ];
      await Producto.insertMany(semilla);
      console.log('✅ Semilla de productos insertada en MongoDB');
    }
    state.productos = await Producto.find().lean();
    console.log(`✅ Productos cargados desde MongoDB: ${state.productos.length}`);
  } catch (err) {
    console.error('Error inicializando productos en MongoDB:', err);
  }
};

db.conectar(inicializarProductosBD);

process.on('uncaughtException', (error) => { console.error('Error no manejado:', error); });
process.on('unhandledRejection', (reason) => { console.error('Promesa rechazada no manejada:', reason); });

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3001;
let currentPort = DEFAULT_PORT;
let attempts = 0;
const MAX_ATTEMPTS = 10;
let isListening = false;

function tryListen() {
  if (isListening) return;
  server.listen(currentPort, '0.0.0.0', () => {
    isListening = true;
    console.log(`🚀 Servidor MiniMarket Innova corriendo en puerto ${currentPort}`);
    console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔴 WebSocket habilitado para tiempo real');
    if (process.env.NODE_ENV !== 'production') console.log(`🌍 Local: http://localhost:${currentPort}`);
  });
}

server.once('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.warn(`Puerto ${currentPort} ocupado.`);
    if (attempts < MAX_ATTEMPTS) {
      attempts++;
      currentPort++;
      console.log(`Intentando puerto ${currentPort} (intento ${attempts}/${MAX_ATTEMPTS})...`);
      setTimeout(tryListen, 500);
    } else {
      console.error('No se pudo bindear puerto después de varios intentos.');
      process.exit(1);
    }
  } else {
    console.error('Error no manejado en el servidor:', error);
    process.exit(1);
  }
});

tryListen();
