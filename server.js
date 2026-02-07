const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configuración de Socket.IO para Railway
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos en producción o proxyear al dev server en desarrollo
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  // Ruta catch-all para React Router (debe ir al final)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  // En desarrollo, proxyear peticiones al dev server de React (hot-reload)
  let proxyInstalled = false;
  try {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    app.use('/', createProxyMiddleware({
      target: 'http://localhost:3002',
      changeOrigin: true,
      ws: true,
      logLevel: 'silent'
    }));
    proxyInstalled = true;
    console.log('Proxy activo: / -> http://localhost:3002');
  } catch (err) {
    console.warn('http-proxy-middleware no está instalado; si quieres usar proxy en dev, instala http-proxy-middleware');
  }

  // Fallback: si el proxy no está disponible, redirigir la raíz al dev server
  if (!proxyInstalled) {
    app.get('/', (req, res) => {
      res.redirect('http://localhost:3002');
    });
  }
}

// Base de datos en memoria (productos sincronizados)
let productos = [
  { 
    id: 1, 
    nombre: 'Arroz Diana 500g', 
    cantidad: 50, 
    precio: 2500, 
    codigoBarras: '7702001001234',
    categoria: 'Granos',
    imagen: 'https://via.placeholder.com/150x150/667eea/white?text=ARROZ',
    fechaCreacion: new Date().toISOString()
  },
  { 
    id: 2, 
    nombre: 'Aceite Gourmet 1L', 
    cantidad: 30, 
    precio: 4500, 
    codigoBarras: '7702002001235',
    categoria: 'Aceites',
    imagen: 'https://via.placeholder.com/150x150/28a745/white?text=ACEITE',
    fechaCreacion: new Date().toISOString()
  },
  { 
    id: 3, 
    nombre: 'Azúcar Incauca 1kg', 
    cantidad: 25, 
    precio: 3200, 
    codigoBarras: '7702003001236',
    categoria: 'Dulces',
    imagen: 'https://via.placeholder.com/150x150/ffc107/white?text=AZUCAR',
    fechaCreacion: new Date().toISOString()
  }
];

let dispositivosConectados = [];
let estadisticas = {
  productosAgregados: 0,
  productosActualizados: 0,
  escaneos: 0,
  inicioServidor: new Date().toISOString()
};

// API REST para Railway health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    dispositivos: dispositivosConectados.length,
    productos: productos.length,
    estadisticas
  });
});

app.get('/api/productos', (req, res) => {
  res.json(productos);
});

app.get('/api/stats', (req, res) => {
  res.json({
    productos: productos.length,
    dispositivos: dispositivosConectados.length,
    estadisticas
  });
});

// Socket.IO para tiempo real
io.on('connection', (socket) => {
  console.log('📱 Dispositivo conectado:', socket.id);
  
  // Agregar dispositivo a la lista
  dispositivosConectados.push({
    id: socket.id,
    conectadoEn: new Date().toISOString(),
    userAgent: socket.handshake.headers['user-agent'] || 'Unknown'
  });
  
  // Enviar productos actuales al conectarse
  socket.emit('productos-sync', productos);
  socket.emit('dispositivos-conectados', dispositivosConectados.length);
  
  // Notificar a todos sobre nueva conexión
  io.emit('dispositivo-conectado', dispositivosConectados.length);

  // Manejar productos
  socket.on('agregar-producto', (producto) => {
    try {
      const nuevoProducto = { 
        ...producto, 
        id: Date.now(),
        fechaCreacion: new Date().toISOString(),
        modificado: true
      };
      productos.push(nuevoProducto);
      estadisticas.productosAgregados++;
      
      // Notificar a TODOS los dispositivos
      io.emit('producto-agregado', nuevoProducto);
      console.log('✅ Producto agregado:', nuevoProducto.nombre);
    } catch (error) {
      console.error('Error agregando producto:', error);
      socket.emit('error', 'Error al agregar producto');
    }
  });

  socket.on('actualizar-producto', (producto) => {
    try {
      const index = productos.findIndex(p => p.id === producto.id);
      if (index !== -1) {
        productos[index] = { 
          ...producto, 
          fechaActualizacion: new Date().toISOString(),
          modificado: true
        };
        estadisticas.productosActualizados++;
        
        // Notificar a TODOS los dispositivos
        io.emit('producto-actualizado', productos[index]);
        console.log('📝 Producto actualizado:', producto.nombre);
      }
    } catch (error) {
      console.error('Error actualizando producto:', error);
      socket.emit('error', 'Error al actualizar producto');
    }
  });

  socket.on('eliminar-producto', (id) => {
    try {
      const productoEliminado = productos.find(p => p.id === id);
      productos = productos.filter(p => p.id !== id);
      
      // Notificar a TODOS los dispositivos
      io.emit('producto-eliminado', id);
      console.log('🗑️ Producto eliminado:', productoEliminado?.nombre || id);
    } catch (error) {
      console.error('Error eliminando producto:', error);
      socket.emit('error', 'Error al eliminar producto');
    }
  });

  // Manejar códigos escaneados
  socket.on('codigo-escaneado', (data) => {
    try {
      estadisticas.escaneos++;
      console.log('📱 Código escaneado:', data);
      
      // Enviar a TODOS los dispositivos EXCEPTO el que escaneó
      socket.broadcast.emit('codigo-escaneado', {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error procesando código:', error);
    }
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    dispositivosConectados = dispositivosConectados.filter(d => d.id !== socket.id);
    console.log('📱 Dispositivo desconectado:', socket.id);
    console.log('Dispositivos conectados:', dispositivosConectados.length);
    
    // Notificar a todos sobre desconexión
    io.emit('dispositivo-desconectado', dispositivosConectados.length);
  });
});

// Nota: las rutas estáticas / catch-all se manejan arriba según NODE_ENV

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3001;
let currentPort = DEFAULT_PORT;
let attempts = 0;
const MAX_ATTEMPTS = 10;

function tryListen() {
  server.listen(currentPort, '0.0.0.0', () => {
    console.log(`🚀 Servidor MiniMarket Innova corriendo en puerto ${currentPort}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 WebSocket habilitado para tiempo real`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔗 Local: http://localhost:${currentPort}`);
    }
  });
}

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.warn(`Puerto ${currentPort} ocupado.`);
    if (attempts < MAX_ATTEMPTS) {
      attempts += 1;
      currentPort += 1;
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

// Manejo de errores globales
process.on('uncaughtException', (error) => {
  console.error('Error no manejado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});

// Iniciar intento de escucha
tryListen();