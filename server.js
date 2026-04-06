require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// Conexi�n a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/minimarket';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    inicializarProductosBD();
  })
  .catch(err => {
    console.warn('⚠️ No se pudo conectar a MongoDB (se mantiene in-memory):', err.message);
  });

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  cantidad: { type: Number, default: 0 },
  precio: { type: Number, default: 0 },
  codigoBarras: String,
  categoria: String,
  proveedor: String,
  proveedorId: Number,
  stockMinimo: Number,
  precioCompra: Number,
  precioVenta: Number,
  margen: Number,
  ubicacion: String,
  descripcion: String,
  estado: { type: String, enum: ['activo', 'agotado', 'descontinuado'], default: 'activo' },
  imagen: String,
  fechaCreacion: { type: Date, default: Date.now },
  fechaActualizacion: Date
});
const Producto = mongoose.model('Producto', productoSchema);

const normalizeProducto = (producto) => {
  if (!producto) return producto;
  const obj = producto.toObject ? producto.toObject() : producto;
  return {
    ...obj,
    id: obj.id ?? obj._id ?? null,
  };
};

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Datos en memoria (fallback)
let productos = [
  { id: 1, nombre: 'Arroz Diana 500g', cantidad: 50, precio: 2500, codigoBarras: '7702001001234', categoria: 'Granos', imagen: 'https://via.placeholder.com/150x150/667eea/white?text=ARROZ', fechaCreacion: new Date().toISOString() },
  { id: 2, nombre: 'Aceite Gourmet 1L', cantidad: 30, precio: 4500, codigoBarras: '7702002001235', categoria: 'Aceites', imagen: 'https://via.placeholder.com/150x150/28a745/white?text=ACEITE', fechaCreacion: new Date().toISOString() },
  { id: 3, nombre: 'Az�car Incauca 1kg', cantidad: 25, precio: 3200, codigoBarras: '7702003001236', categoria: 'Dulces', imagen: 'https://via.placeholder.com/150x150/ffc107/white?text=AZUCAR', fechaCreacion: new Date().toISOString() }
];

let dispositivosConectados = [];
let estadisticas = { productosAgregados: 0, productosActualizados: 0, escaneos: 0, inicioServidor: new Date().toISOString() };

async function inicializarProductosBD() {
  try {
    const count = await Producto.countDocuments();
    if (count === 0) {
      await Producto.insertMany(productos.map(p => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
        codigoBarras: p.codigoBarras,
        categoria: p.categoria,
        imagen: p.imagen,
        fechaCreacion: p.fechaCreacion
      })));
      console.log('? Semilla de productos insertada en MongoDB');
    }
    productos = await Producto.find().lean();
    console.log(`? Productos cargados desde MongoDB: ${productos.length}`);
  } catch (err) {
    console.error('Error inicializando productos en MongoDB:', err);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), dispositivos: dispositivosConectados.length, productos: productos.length, estadisticas });
});

app.get('/api/productos', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const todos = await Producto.find().lean();
      return res.json(todos.map(normalizeProducto));
    }
    return res.json(productos.map(normalizeProducto));
  } catch (error) {
    console.error('Error /api/productos:', error);
    res.status(500).json({ error: 'No se pudieron obtener productos' });
  }
});

app.get('/api/tienda/productos', async (req, res) => {
  try {
    const { categoria } = req.query;
    let filtro = {};
    if (categoria) filtro.categoria = categoria;

    if (mongoose.connection.readyState === 1) {
      const result = await Producto.find(filtro).lean();
      return res.json(result.map(normalizeProducto));
    }

    const result = categoria ? productos.filter(p => p.categoria === categoria) : productos;
    res.json(result.map(normalizeProducto));
  } catch (error) {
    console.error('Error /api/tienda/productos:', error);
    res.status(500).json({ error: 'No se pudieron obtener productos de tienda' });
  }
});

app.post('/api/tienda/productos', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.nombre) {
      return res.status(400).json({ error: 'Producto inválido' });
    }

    if (mongoose.connection.readyState === 1) {
      const nuevo = await Producto.create({
        nombre: payload.nombre,
        cantidad: payload.cantidad || 0,
        precio: payload.precio || 0,
        codigoBarras: payload.codigoBarras || '',
        categoria: payload.categoria || '',
        imagen: payload.imagen || '',
        proveedor: payload.proveedor || '',
        proveedorId: payload.proveedorId || 0,
        stockMinimo: payload.stockMinimo || 0,
        precioCompra: payload.precioCompra || 0,
        precioVenta: payload.precioVenta || 0,
        margen: payload.margen || 0,
        ubicacion: payload.ubicacion || '',
        descripcion: payload.descripcion || '',
        estado: payload.estado || 'activo',
        fechaActualizacion: new Date()
      });
      productos = await Producto.find().lean();
      const productoNormalizado = normalizeProducto(nuevo);
      estadisticas.productosAgregados++;
      io.emit('producto-agregado', productoNormalizado);
      return res.status(201).json(productoNormalizado);
    }

    const nuevoProducto = { ...payload, id: Date.now(), fechaCreacion: new Date().toISOString(), ultimaActualizacion: new Date().toISOString() };
    productos.push(nuevoProducto);
    estadisticas.productosAgregados++;
    io.emit('producto-agregado', nuevoProducto);
    return res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error('Error POST /api/tienda/productos:', error);
    res.status(500).json({ error: 'No se pudo crear producto' });
  }
});

app.put('/api/tienda/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cambios = req.body;

    if (mongoose.connection.readyState === 1) {
      const actualizado = await Producto.findByIdAndUpdate(id, {
        ...cambios,
        fechaActualizacion: new Date(),
        ultimaActualizacion: new Date().toISOString()
      }, { new: true });

      if (!actualizado) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      productos = await Producto.find().lean();
      const productoNormalizado = normalizeProducto(actualizado);
      estadisticas.productosActualizados++;
      io.emit('producto-actualizado', productoNormalizado);
      return res.json(productoNormalizado);
    }

    const index = productos.findIndex((p) => `${p.id}` === `${id}`);
    if (index === -1) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const actualizado = {
      ...productos[index],
      ...cambios,
      ultimaActualizacion: new Date().toISOString()
    };

    productos[index] = actualizado;
    estadisticas.productosActualizados++;
    io.emit('producto-actualizado', actualizado);
    return res.json(actualizado);
  } catch (error) {
    console.error('Error PUT /api/tienda/productos/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar producto' });
  }
});

app.get('/api/stats', (req, res) => {
  res.json({ productos: productos.length, dispositivos: dispositivosConectados.length, estadisticas });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  let proxyInstalled = false;
  try {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    app.use('/', createProxyMiddleware({ target: 'http://localhost:3002', changeOrigin: true, ws: true, logLevel: 'silent' }));
    proxyInstalled = true;
    console.log('Proxy activo: / -> http://localhost:3002');
  } catch (err) {
    console.warn('http-proxy-middleware no est� instalado; si quieres usar proxy en dev, instala http-proxy-middleware');
  }

  if (!proxyInstalled) {
    app.get('/', (req, res) => {
      res.redirect('http://localhost:3002');
    });
  }
}

io.on('connection', (socket) => {
  console.log('?? Dispositivo conectado:', socket.id);
  dispositivosConectados.push({ id: socket.id, conectadoEn: new Date().toISOString(), userAgent: socket.handshake.headers['user-agent'] || 'Unknown' });

  socket.emit('productos-sync', productos);
  socket.emit('dispositivos-conectados', dispositivosConectados.length);
  io.emit('dispositivo-conectado', dispositivosConectados.length);

  socket.on('agregar-producto', async (producto) => {
    try {
      if (!producto || !producto.nombre) return;
      let nuevoProducto = { ...producto, id: Date.now(), fechaCreacion: new Date().toISOString(), modificado: true };
      if (mongoose.connection.readyState === 1) {
        const doc = await Producto.create({
          nombre: producto.nombre,
          cantidad: producto.cantidad || 0,
          precio: producto.precio || 0,
          codigoBarras: producto.codigoBarras || '',
          categoria: producto.categoria || '',
          imagen: producto.imagen || ''
        });
        nuevoProducto = doc.toObject();
        productos.push(nuevoProducto);
      } else {
        productos.push(nuevoProducto);
      }
      estadisticas.productosAgregados++;
      io.emit('producto-agregado', nuevoProducto);
      console.log('? Producto agregado:', nuevoProducto.nombre);
    } catch (error) {
      console.error('Error agregando producto:', error);
      socket.emit('error', 'Error al agregar producto');
    }
  });

  socket.on('actualizar-producto', async (producto) => {
    try {
      const index = productos.findIndex(p => p.id === producto.id);
      if (index !== -1) {
        const actualizado = { ...producto, fechaActualizacion: new Date().toISOString(), modificado: true };
        productos[index] = actualizado;
        if (mongoose.connection.readyState === 1) {
          await Producto.findOneAndUpdate({ _id: producto._id || producto.id }, {
            nombre: producto.nombre,
            cantidad: producto.cantidad,
            precio: producto.precio,
            codigoBarras: producto.codigoBarras,
            categoria: producto.categoria,
            imagen: producto.imagen,
            fechaActualizacion: new Date()
          }, { new: true, upsert: false });
        }
        estadisticas.productosActualizados++;
        io.emit('producto-actualizado', actualizado);
        console.log('?? Producto actualizado:', producto.nombre);
      }
    } catch (error) {
      console.error('Error actualizando producto:', error);
      socket.emit('error', 'Error al actualizar producto');
    }
  });

  socket.on('eliminar-producto', async (id) => {
    try {
      const productoEliminado = productos.find(p => p.id === id);
      productos = productos.filter(p => p.id !== id);
      if (mongoose.connection.readyState === 1) {
        await Producto.findByIdAndDelete(id).catch(() => null);
      }
      io.emit('producto-eliminado', id);
      console.log('??? Producto eliminado:', productoEliminado?.nombre || id);
    } catch (error) {
      console.error('Error eliminando producto:', error);
      socket.emit('error', 'Error al eliminar producto');
    }
  });

  socket.on('codigo-escaneado', (data) => {
    try {
      estadisticas.escaneos++;
      console.log('?? C�digo escaneado:', data);
      socket.broadcast.emit('codigo-escaneado', { ...data, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error procesando c�digo:', error);
    }
  });

  socket.on('ping', () => { socket.emit('pong'); });

  socket.on('disconnect', () => {
    dispositivosConectados = dispositivosConectados.filter(d => d.id !== socket.id);
    console.log('?? Dispositivo desconectado:', socket.id);
    console.log('Dispositivos conectados:', dispositivosConectados.length);
    io.emit('dispositivo-desconectado', dispositivosConectados.length);
    if (process.env.NODE_ENV !== 'production' && dispositivosConectados.length === 0) {
      console.log('?? Sin conexiones activas. Cerrando servidor autom�ticamente.');
      setTimeout(() => { if (dispositivosConectados.length === 0) process.exit(0); }, 1000);
    }
  });
});

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3001;
let currentPort = DEFAULT_PORT;
let attempts = 0;
const MAX_ATTEMPTS = 10;
let isListening = false;

function tryListen() {
  if (isListening) return;
  server.listen(currentPort, '0.0.0.0', () => {
    isListening = true;
    console.log(`?? Servidor MiniMarket Innova corriendo en puerto ${currentPort}`);
    console.log(`?? Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log('?? WebSocket habilitado para tiempo real');
    if (process.env.NODE_ENV !== 'production') console.log(`?? Local: http://localhost:${currentPort}`);
  });
}

server.once('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.warn(`Puerto ${currentPort} ocupado.`);
    if (attempts < MAX_ATTEMPTS) {
      attempts += 1; currentPort += 1;
      console.log(`Intentando puerto ${currentPort} (intento ${attempts}/${MAX_ATTEMPTS})...`);
      setTimeout(tryListen, 500);
    } else {
      console.error('No se pudo bindear puerto despu�s de varios intentos.');
      process.exit(1);
    }
  } else {
    console.error('Error no manejado en el servidor:', error);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => { console.error('Error no manejado:', error); });
process.on('unhandledRejection', (reason) => { console.error('Promesa rechazada no manejada:', reason); });

tryListen();
