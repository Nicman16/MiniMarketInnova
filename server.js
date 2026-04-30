require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const app = express();
const server = http.createServer(app);

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
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...fromEnv]));
};

const ALLOWED_ORIGINS = parseAllowedOrigins();
const isAllowedOrigin = (origin) => !origin || ALLOWED_ORIGINS.includes(origin);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);

let smtpTransporter = null;
const getSmtpTransporter = () => {
  if (!smtpConfigured) return null;
  if (smtpTransporter) return smtpTransporter;

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return smtpTransporter;
};

console.log('🌐 CORS habilitado para orígenes:', ALLOWED_ORIGINS.join(', '));

// Conexión a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/minimarket';
const DISPLAY_URI = MONGO_URI.replace(/:\/\/.*@/, '://***:***@').split('?')[0];
console.log('🔍 Intentando conectar a MongoDB:', DISPLAY_URI);
console.log('📍 Entorno:', process.env.NODE_ENV);

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000, // Timeout de 10 segundos
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
})
  .then(() => {
    console.log('✅ MongoDB conectado exitosamente');
    inicializarProductosBD();
    // Demo users are only initialized via manual seed script, never auto-loaded
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ Para cargar usuarios demo en desarrollo, ejecuta: npm run seed:demo');
    }
  })
  .catch(err => {
    console.warn('⚠️ No se pudo conectar a MongoDB (se mantiene in-memory):', err.message);
    console.warn('💡 Asegúrate de que MongoDB esté corriendo o configura MONGO_URI correctamente');
    console.warn('💡 Para desarrollo local: instala MongoDB o usa MongoDB Atlas');
    console.warn('💡 Para Railway: verifica que el servicio MongoDB esté configurado');
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

// Schema para Usuarios
const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  pin: { type: String, unique: true, sparse: true },
  rol: { type: String, enum: ['jefe', 'empleado'], default: 'empleado' },
  estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
  emailVerificado: { type: Boolean, default: false },
  tokenVerificacionHash: String,
  tokenVerificacionExpira: Date,
  fechaCreacion: { type: Date, default: Date.now },
  ultimoAcceso: Date
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

// Schema para Deudas
const deudaSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['cliente', 'empleado'], required: true },
  referencia: { type: String, required: true }, // ID del cliente o empleado
  nombrePersona: { type: String, required: true },
  monto: { type: Number, required: true },
  razon: String,
  fecha: { type: Date, default: Date.now },
  estado: { type: String, enum: ['pendiente', 'parcial', 'pagada'], default: 'pendiente' },
  saldo: { type: Number, required: true }
});
const Deuda = mongoose.model('Deuda', deudaSchema);

// Schema para Transacciones de Deuda
const transaccionDeudaSchema = new mongoose.Schema({
  deudaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deuda', required: true },
  tipo: { type: String, enum: ['cargo', 'abono'], required: true },
  monto: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  razon: String,
  empleadoRegistro: String,
  comprobante: {
    foto: String,
    descripcion: String,
    tipoComprobante: { type: String, enum: ['foto_pago', 'recibo', 'ticket'] }
  }
});
const TransaccionDeuda = mongoose.model('TransaccionDeuda', transaccionDeudaSchema);

const sesionCajaSchema = new mongoose.Schema({
  empleadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  empleadoNombre: { type: String, required: true },
  empleadoEmail: { type: String, required: true },
  empleadoRol: { type: String, enum: ['jefe', 'empleado'], required: true },
  fechaApertura: { type: Date, default: Date.now },
  fechaCierre: Date,
  montoApertura: { type: Number, required: true },
  montoCierre: Number,
  ventasEfectivo: { type: Number, default: 0 },
  ventasTarjeta: { type: Number, default: 0 },
  ventasTransferencia: { type: Number, default: 0 },
  ingresos: { type: Number, default: 0 },
  egresos: { type: Number, default: 0 },
  estado: { type: String, enum: ['abierta', 'cerrada'], default: 'abierta' }
});
const SesionCaja = mongoose.model('SesionCaja', sesionCajaSchema);

const movimientoCajaSchema = new mongoose.Schema({
  sesionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SesionCaja', required: true },
  tipo: { type: String, enum: ['ingreso', 'egreso', 'venta'], required: true },
  monto: { type: Number, required: true },
  concepto: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  empleadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  empleadoNombre: { type: String, required: true },
  empleadoEmail: { type: String, required: true },
  empleadoRol: { type: String, enum: ['jefe', 'empleado'], required: true }
});
const MovimientoCaja = mongoose.model('MovimientoCaja', movimientoCajaSchema);

const ventaItemSchema = new mongoose.Schema({
  productoId: { type: String, required: true },
  nombre: { type: String, required: true },
  codigoBarras: String,
  categoria: String,
  cantidad: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
  subtotal: { type: Number, required: true }
}, { _id: false });

const ventaSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  items: { type: [ventaItemSchema], required: true },
  subtotal: { type: Number, required: true },
  iva: { type: Number, default: 0 },
  descuentos: { type: Number, default: 0 },
  total: { type: Number, required: true },
  metodoPago: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia'], required: true },
  vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  vendedorNombre: { type: String, required: true },
  vendedorEmail: { type: String, required: true },
  vendedorRol: { type: String, enum: ['jefe', 'empleado'], required: true },
  estado: { type: String, enum: ['completada', 'cancelada'], default: 'completada' }
});
const Venta = mongoose.model('Venta', ventaSchema);

const normalizeProducto = (producto) => {
  if (!producto) return producto;
  const obj = producto.toObject ? producto.toObject() : producto;
  return {
    ...obj,
    id: obj.id?.toString?.() || obj._id?.toString?.() || obj.id || obj._id || null,
  };
};

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin || 'N/A'}`));
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet());

// CORS configuration (restrict origin instead of *)
const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origen no permitido por CORS: ${origin || 'N/A'}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting for API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/registro', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware para verificar token JWT
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_aqui');
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const requireJefe = (req, res, next) => {
  if (req.usuario?.rol !== 'jefe') {
    return res.status(403).json({ error: 'Solo administradores pueden realizar esta acción' });
  }

  next();
};

const normalizeEmpleado = (usuarioDoc) => {
  if (!usuarioDoc) return null;

  const usuario = usuarioDoc.toObject ? usuarioDoc.toObject() : usuarioDoc;
  return {
    id: usuario._id?.toString?.() || usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    activo: usuario.estado === 'activo',
    emailVerificado: !!usuario.emailVerificado,
    pin: usuario.pin || '',
    fechaCreacion: usuario.fechaCreacion,
    ultimoAcceso: usuario.ultimoAcceso
  };
};

const hashVerificationToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const createVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  return {
    rawToken,
    tokenHash: hashVerificationToken(rawToken),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
  };
};

const getAppUrl = () => {
  const configuredUrl = process.env.APP_URL || process.env.REACT_APP_API_URL;
  return (configuredUrl || 'http://localhost:3002').replace(/\/$/, '');
};

const sendVerificationEmail = async ({ email, nombre, token }) => {
  const activationLink = `${getAppUrl()}/activar?token=${token}`;

  if (resend && process.env.RESEND_FROM_EMAIL) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Activa tu cuenta de MiniMarket Innova',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Hola ${nombre || 'usuario'},</h2>
          <p>Tu cuenta ya fue creada en MiniMarket Innova.</p>
          <p>Para activar tu acceso y definir tu contraseña, usa este enlace:</p>
          <p><a href="${activationLink}">${activationLink}</a></p>
          <p>Este enlace vence en 24 horas.</p>
        </div>
      `
    });

    return { sent: true, provider: 'resend', activationLink };
  }

  const smtpTransport = getSmtpTransporter();
  if (smtpTransport) {
    await smtpTransport.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Activa tu cuenta de MiniMarket Innova',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Hola ${nombre || 'usuario'},</h2>
          <p>Tu cuenta ya fue creada en MiniMarket Innova.</p>
          <p>Para activar tu acceso y definir tu contraseña, usa este enlace:</p>
          <p><a href="${activationLink}">${activationLink}</a></p>
          <p>Este enlace vence en 24 horas.</p>
        </div>
      `
    });

    return { sent: true, provider: 'smtp', activationLink };
  }

  console.warn(`⚠️ Correo no enviado a ${email}. Configura Resend o SMTP.`);
  console.warn(`🔗 Enlace de activación: ${activationLink}`);

  return { sent: false, provider: 'manual', activationLink };
};

const normalizeSesionCaja = (sesionDoc) => {
  if (!sesionDoc) return null;

  const sesion = sesionDoc.toObject ? sesionDoc.toObject() : sesionDoc;
  return {
    id: sesion._id?.toString?.() || sesion.id,
    empleado: {
      id: sesion.empleadoId?.toString?.() || sesion.empleadoId,
      nombre: sesion.empleadoNombre,
      email: sesion.empleadoEmail,
      rol: sesion.empleadoRol,
      activo: true
    },
    fechaApertura: sesion.fechaApertura,
    fechaCierre: sesion.fechaCierre,
    montoApertura: sesion.montoApertura,
    montoCierre: sesion.montoCierre,
    ventasEfectivo: sesion.ventasEfectivo || 0,
    ventasTarjeta: sesion.ventasTarjeta || 0,
    ventasTransferencia: sesion.ventasTransferencia || 0,
    ingresos: sesion.ingresos || 0,
    egresos: sesion.egresos || 0,
    estado: sesion.estado
  };
};

const normalizeMovimientoCaja = (movimientoDoc) => {
  if (!movimientoDoc) return null;

  const movimiento = movimientoDoc.toObject ? movimientoDoc.toObject() : movimientoDoc;
  return {
    id: movimiento._id?.toString?.() || movimiento.id,
    tipo: movimiento.tipo,
    monto: movimiento.monto,
    concepto: movimiento.concepto,
    fecha: movimiento.fecha,
    empleado: {
      id: movimiento.empleadoId?.toString?.() || movimiento.empleadoId,
      nombre: movimiento.empleadoNombre,
      email: movimiento.empleadoEmail,
      rol: movimiento.empleadoRol,
      activo: true
    }
  };
};

const normalizeVenta = (ventaDoc) => {
  if (!ventaDoc) return null;

  const venta = ventaDoc.toObject ? ventaDoc.toObject() : ventaDoc;
  return {
    id: venta._id?.toString?.() || venta.id,
    fecha: venta.fecha,
    items: (venta.items || []).map((item) => ({
      productoId: item.productoId,
      nombre: item.nombre,
      codigoBarras: item.codigoBarras,
      categoria: item.categoria,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal
    })),
    subtotal: venta.subtotal,
    iva: venta.iva || 0,
    descuentos: venta.descuentos || 0,
    total: venta.total,
    metodoPago: venta.metodoPago,
    vendedor: {
      id: venta.vendedorId?.toString?.() || venta.vendedorId,
      nombre: venta.vendedorNombre,
      email: venta.vendedorEmail,
      rol: venta.vendedorRol,
      activo: true
    },
    estado: venta.estado
  };
};

const isMongoReady = () => mongoose.connection.readyState === 1;

const buildDayRange = (fecha) => ({
  inicio: new Date(`${fecha}T00:00:00.000Z`),
  fin: new Date(`${fecha}T23:59:59.999Z`)
});

const getVentasEntreFechas = async (inicio, fin) => {
  if (isMongoReady()) {
    return Venta.find({ fecha: { $gte: inicio, $lte: fin } }).lean();
  }

  return ventasRegistradas.filter((venta) => {
    const fechaVenta = new Date(venta.fecha);
    return fechaVenta >= inicio && fechaVenta <= fin;
  });
};

const resumirVentas = (ventas) => ventas.reduce((acc, venta) => {
  const totalVenta = Number(venta.total || 0);
  const cantidadItems = (venta.items || []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0);

  acc.totalVentas += totalVenta;
  acc.cantidadVentas += 1;
  acc.productosVendidos += cantidadItems;

  if (venta.metodoPago === 'efectivo') {
    acc.ventasEfectivo += totalVenta;
  } else if (venta.metodoPago === 'tarjeta') {
    acc.ventasTarjeta += totalVenta;
  } else if (venta.metodoPago === 'transferencia') {
    acc.ventasTransferencia += totalVenta;
  }

  return acc;
}, {
  totalVentas: 0,
  cantidadVentas: 0,
  productosVendidos: 0,
  ventasEfectivo: 0,
  ventasTarjeta: 0,
  ventasTransferencia: 0
});

// ========== RUTAS DE AUTENTICACIÓN ==========
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, contraseña } = req.body;
    
    if (!email || !contraseña) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    // Buscar usuario por email
    const usuario = await Usuario.findOne({ email });
    
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    if (usuario.estado !== 'activo') {
      return res.status(403).json({ error: 'La cuenta está inactiva' });
    }

    if (!usuario.emailVerificado) {
      return res.status(403).json({ error: 'Debes verificar tu correo antes de iniciar sesión' });
    }
    
    // Verificar contraseña
    const esValida = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!esValida) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET || 'tu_clave_secreta_aqui',
      { expiresIn: '7d' }
    );
    
    // Actualizar último acceso
    usuario.ultimoAcceso = new Date();
    await usuario.save();
    
    // Responder sin la contraseña
    const usuarioSinPassword = usuario.toObject();
    delete usuarioSinPassword.contraseña;
    
    res.json({
      token,
      usuario: usuarioSinPassword
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al intentar login' });
  }
});

app.post('/api/auth/registro', async (req, res) => {
  return res.status(403).json({ error: 'El registro público está deshabilitado. Un jefe debe crear la cuenta.' });
});

app.post('/api/auth/activar', async (req, res) => {
  try {
    const { token, contraseña } = req.body;

    if (!token || !contraseña) {
      return res.status(400).json({ error: 'Token y contraseña son requeridos' });
    }

    if (String(contraseña).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const tokenHash = hashVerificationToken(token);
    const usuario = await Usuario.findOne({
      tokenVerificacionHash: tokenHash,
      tokenVerificacionExpira: { $gt: new Date() }
    });

    if (!usuario) {
      return res.status(400).json({ error: 'El enlace de activación no es válido o ya venció' });
    }

    const salt = await bcrypt.genSalt(10);
    usuario.contraseña = await bcrypt.hash(contraseña, salt);
    usuario.emailVerificado = true;
    usuario.tokenVerificacionHash = undefined;
    usuario.tokenVerificacionExpira = undefined;
    await usuario.save();

    res.json({ mensaje: 'Cuenta activada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en activación:', error);
    res.status(500).json({ error: 'Error al activar la cuenta' });
  }
});

app.get('/api/auth/me', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-contraseña');
    res.json(usuario);
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
});

// ========== RUTAS DE EMPLEADOS ===========

app.get('/api/empleados', verificarToken, requireJefe, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-contraseña').sort({ fechaCreacion: -1 });
    res.json(usuarios.map(normalizeEmpleado));
  } catch (error) {
    console.error('Error en GET /api/empleados:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

app.post('/api/empleados', verificarToken, requireJefe, async (req, res) => {
  try {
    const { nombre, email, rol = 'empleado', pin } = req.body;

    if (!nombre || !email || !pin) {
      return res.status(400).json({ error: 'Nombre, email y PIN son requeridos' });
    }

    if (String(pin).length < 4) {
      return res.status(400).json({ error: 'El PIN debe tener al menos 4 dígitos' });
    }

    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Ya existe un empleado con ese email' });
    }

    const pinExistente = await Usuario.findOne({ pin });
    if (pinExistente) {
      return res.status(400).json({ error: 'Ya existe un empleado con ese PIN' });
    }

    const passwordTemporal = crypto.randomBytes(24).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const contraseniaHasheada = await bcrypt.hash(passwordTemporal, salt);
    const verification = createVerificationToken();

    const nuevoEmpleado = await Usuario.create({
      nombre,
      email,
      contraseña: contraseniaHasheada,
      pin,
      rol,
      estado: 'activo',
      emailVerificado: false,
      tokenVerificacionHash: verification.tokenHash,
      tokenVerificacionExpira: verification.expiresAt
    });

    const emailResult = await sendVerificationEmail({
      email,
      nombre,
      token: verification.rawToken
    });

    res.status(201).json({
      ...normalizeEmpleado(nuevoEmpleado),
      invitacionEnviada: emailResult.sent,
      activationLink: emailResult.activationLink
    });
  } catch (error) {
    console.error('Error en POST /api/empleados:', error);
    res.status(500).json({ error: 'Error al crear empleado' });
  }
});

app.put('/api/empleados/:id', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, pin, activo } = req.body;

    const empleado = await Usuario.findById(id);
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    if (email && email !== empleado.email) {
      const emailExistente = await Usuario.findOne({ email, _id: { $ne: id } });
      if (emailExistente) {
        return res.status(400).json({ error: 'Ya existe un empleado con ese email' });
      }
      empleado.email = email;
    }

    if (pin && pin !== empleado.pin) {
      if (String(pin).length < 4) {
        return res.status(400).json({ error: 'El PIN debe tener al menos 4 dígitos' });
      }

      const pinExistente = await Usuario.findOne({ pin, _id: { $ne: id } });
      if (pinExistente) {
        return res.status(400).json({ error: 'Ya existe un empleado con ese PIN' });
      }

      empleado.pin = pin;
    }

    if (typeof nombre === 'string') empleado.nombre = nombre;
    if (rol === 'jefe' || rol === 'empleado') empleado.rol = rol;
    if (typeof activo === 'boolean') empleado.estado = activo ? 'activo' : 'inactivo';

    await empleado.save();
    res.json(normalizeEmpleado(empleado));
  } catch (error) {
    console.error('Error en PUT /api/empleados/:id:', error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

app.patch('/api/empleados/:id/toggle-estado', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;
    const empleado = await Usuario.findById(id);

    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    if (empleado.rol === 'jefe' && empleado.estado === 'activo') {
      const jefesActivos = await Usuario.countDocuments({ rol: 'jefe', estado: 'activo' });
      if (jefesActivos <= 1) {
        return res.status(400).json({ error: 'No se puede desactivar el último jefe' });
      }
    }

    empleado.estado = empleado.estado === 'activo' ? 'inactivo' : 'activo';
    await empleado.save();

    res.json(normalizeEmpleado(empleado));
  } catch (error) {
    console.error('Error en PATCH /api/empleados/:id/toggle-estado:', error);
    res.status(500).json({ error: 'Error al cambiar estado del empleado' });
  }
});

app.delete('/api/empleados/:id', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.usuario.id === id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    const empleado = await Usuario.findById(id);
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    if (empleado.rol === 'jefe') {
      const totalJefes = await Usuario.countDocuments({ rol: 'jefe' });
      if (totalJefes <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el último jefe' });
      }
    }

    await Usuario.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error en DELETE /api/empleados/:id:', error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

// ========== RUTAS DE CAJA ===========

app.get('/api/caja/sesion-activa', verificarToken, requireJefe, async (req, res) => {
  try {
    const sesion = await SesionCaja.findOne({ estado: 'abierta' }).sort({ fechaApertura: -1 });
    res.json(sesion ? normalizeSesionCaja(sesion) : null);
  } catch (error) {
    console.error('Error en GET /api/caja/sesion-activa:', error);
    res.status(500).json({ error: 'Error al obtener sesión activa' });
  }
});

app.post('/api/caja/abrir', verificarToken, requireJefe, async (req, res) => {
  try {
    const { empleadoId, pin, montoApertura } = req.body;

    if (!empleadoId || !pin || !montoApertura) {
      return res.status(400).json({ error: 'Empleado, PIN y monto de apertura son requeridos' });
    }

    const sesionExistente = await SesionCaja.findOne({ estado: 'abierta' });
    if (sesionExistente) {
      return res.status(400).json({ error: 'Ya hay una sesión de caja abierta' });
    }

    const empleado = await Usuario.findById(empleadoId);
    if (!empleado || empleado.estado !== 'activo') {
      return res.status(404).json({ error: 'Empleado no encontrado o inactivo' });
    }

    if (empleado.pin !== pin) {
      return res.status(401).json({ error: 'PIN incorrecto' });
    }

    const sesion = await SesionCaja.create({
      empleadoId: empleado._id,
      empleadoNombre: empleado.nombre,
      empleadoEmail: empleado.email,
      empleadoRol: empleado.rol,
      montoApertura: Number(montoApertura),
      estado: 'abierta'
    });

    await MovimientoCaja.create({
      sesionId: sesion._id,
      tipo: 'ingreso',
      monto: Number(montoApertura),
      concepto: 'Apertura de caja',
      empleadoId: empleado._id,
      empleadoNombre: empleado.nombre,
      empleadoEmail: empleado.email,
      empleadoRol: empleado.rol
    });

    const sesionNormalizada = normalizeSesionCaja(sesion);
    io.emit('caja-abierta', sesionNormalizada);
    res.status(201).json(sesionNormalizada);
  } catch (error) {
    console.error('Error en POST /api/caja/abrir:', error);
    res.status(500).json({ error: 'Error al abrir caja' });
  }
});

app.post('/api/caja/:id/cerrar', verificarToken, requireJefe, async (req, res) => {
  try {
    const { id } = req.params;
    const { montoCierre } = req.body;

    const sesion = await SesionCaja.findById(id);
    if (!sesion) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    if (sesion.estado === 'cerrada') {
      return res.status(400).json({ error: 'La sesión ya está cerrada' });
    }

    sesion.fechaCierre = new Date();
    sesion.montoCierre = Number(montoCierre || 0);
    sesion.estado = 'cerrada';
    await sesion.save();

    const sesionNormalizada = normalizeSesionCaja(sesion);
    io.emit('caja-cerrada', sesionNormalizada);
    res.json(sesionNormalizada);
  } catch (error) {
    console.error('Error en POST /api/caja/:id/cerrar:', error);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
});

app.post('/api/caja/movimiento', verificarToken, requireJefe, async (req, res) => {
  try {
    const { tipo, monto, concepto, empleadoId } = req.body;

    if (!tipo || !monto || !concepto || !empleadoId) {
      return res.status(400).json({ error: 'Tipo, monto, concepto y empleado son requeridos' });
    }

    const sesion = await SesionCaja.findOne({ estado: 'abierta' }).sort({ fechaApertura: -1 });
    if (!sesion) {
      return res.status(400).json({ error: 'No hay una sesión de caja abierta' });
    }

    const empleado = await Usuario.findById(empleadoId);
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const movimiento = await MovimientoCaja.create({
      sesionId: sesion._id,
      tipo,
      monto: Number(monto),
      concepto,
      empleadoId: empleado._id,
      empleadoNombre: empleado.nombre,
      empleadoEmail: empleado.email,
      empleadoRol: empleado.rol
    });

    if (tipo === 'ingreso') {
      sesion.ingresos += Number(monto);
    } else if (tipo === 'egreso') {
      sesion.egresos += Number(monto);
    }

    await sesion.save();

    const movimientoNormalizado = normalizeMovimientoCaja(movimiento);
    io.emit('movimiento-caja', movimientoNormalizado);
    res.status(201).json(movimientoNormalizado);
  } catch (error) {
    console.error('Error en POST /api/caja/movimiento:', error);
    res.status(500).json({ error: 'Error al registrar movimiento de caja' });
  }
});

app.get('/api/caja/movimientos', verificarToken, requireJefe, async (req, res) => {
  try {
    const fecha = String(req.query.fecha || new Date().toISOString().split('T')[0]);
    const inicio = new Date(`${fecha}T00:00:00.000Z`);
    const fin = new Date(`${fecha}T23:59:59.999Z`);

    const movimientos = await MovimientoCaja.find({
      fecha: { $gte: inicio, $lte: fin }
    }).sort({ fecha: -1 });

    res.json(movimientos.map(normalizeMovimientoCaja));
  } catch (error) {
    console.error('Error en GET /api/caja/movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

app.get('/api/caja/resumen', verificarToken, requireJefe, async (req, res) => {
  try {
    const fecha = String(req.query.fecha || new Date().toISOString().split('T')[0]);
    const { inicio, fin } = buildDayRange(fecha);
    const sesion = await SesionCaja.findOne({ fechaApertura: { $gte: inicio, $lte: fin } }).sort({ fechaApertura: -1 });
    const movimientos = await MovimientoCaja.find({ fecha: { $gte: inicio, $lte: fin } });
    const ventas = await getVentasEntreFechas(inicio, fin);
    const resumenVentas = resumirVentas(ventas);

    const ingresos = movimientos
      .filter((movimiento) => movimiento.tipo === 'ingreso' && movimiento.concepto !== 'Apertura de caja')
      .reduce((total, movimiento) => total + movimiento.monto, 0);

    const egresos = movimientos
      .filter((movimiento) => movimiento.tipo === 'egreso')
      .reduce((total, movimiento) => total + movimiento.monto, 0);

    const totalEnCaja = (sesion?.montoApertura || 0) + resumenVentas.ventasEfectivo + ingresos - egresos;

    res.json({
      totalVentas: resumenVentas.totalVentas,
      cantidadVentas: resumenVentas.cantidadVentas,
      ventasEfectivo: resumenVentas.ventasEfectivo,
      ventasTarjeta: resumenVentas.ventasTarjeta,
      ventasTransferencia: resumenVentas.ventasTransferencia,
      ingresos,
      egresos,
      totalEnCaja,
      sesionActiva: sesion ? normalizeSesionCaja(sesion) : null
    });
  } catch (error) {
    console.error('Error en GET /api/caja/resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen de caja' });
  }
});

app.get('/api/caja/resumen-cierre', verificarToken, requireJefe, async (req, res) => {
  try {
    const sesion = await SesionCaja.findOne({ estado: 'abierta' }).sort({ fechaApertura: -1 });
    if (!sesion) {
      return res.status(404).json({ error: 'No hay una sesión de caja abierta' });
    }

    const fecha = new Date(sesion.fechaApertura).toISOString().split('T')[0];
    const { inicio, fin } = buildDayRange(fecha);
    const movimientos = await MovimientoCaja.find({ fecha: { $gte: inicio, $lte: fin } });
    const ventas = await getVentasEntreFechas(inicio, fin);
    const resumenVentas = resumirVentas(ventas);

    const ingresos = movimientos
      .filter((movimiento) => movimiento.tipo === 'ingreso' && movimiento.concepto !== 'Apertura de caja')
      .reduce((total, movimiento) => total + movimiento.monto, 0);

    const egresos = movimientos
      .filter((movimiento) => movimiento.tipo === 'egreso')
      .reduce((total, movimiento) => total + movimiento.monto, 0);

    const totalEsperado = (sesion.montoApertura || 0) + resumenVentas.ventasEfectivo + ingresos - egresos;

    res.json({
      totalVentas: resumenVentas.totalVentas,
      cantidadVentas: resumenVentas.cantidadVentas,
      ventasEfectivo: resumenVentas.ventasEfectivo,
      ventasTarjeta: resumenVentas.ventasTarjeta,
      ventasTransferencia: resumenVentas.ventasTransferencia,
      ingresos,
      egresos,
      totalEsperado
    });
  } catch (error) {
    console.error('Error en GET /api/caja/resumen-cierre:', error);
    res.status(500).json({ error: 'Error al obtener resumen para cierre' });
  }
});

// ========== RUTAS DE FIADO/DEUDA ==========

// Crear nueva deuda
app.post('/api/deuda/crear', verificarToken, async (req, res) => {
  try {
    const { tipo, referencia, nombrePersona, monto, razon } = req.body;
    
    if (!tipo || !referencia || !nombrePersona || !monto) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    const nuevaDeuda = new Deuda({
      tipo,
      referencia,
      nombrePersona,
      monto,
      razon: razon || 'Sin especificar',
      saldo: monto,
      fecha: new Date()
    });
    
    await nuevaDeuda.save();
    
    res.status(201).json({
      mensaje: 'Deuda creada exitosamente',
      deuda: nuevaDeuda
    });
  } catch (error) {
    console.error('Error crear deuda:', error);
    res.status(500).json({ error: 'Error al crear deuda' });
  }
});

// Obtener todas las deudas (con filtro opcional)
app.get('/api/deuda/lista', verificarToken, async (req, res) => {
  try {
    const { tipo, estado } = req.query;
    let filtro = {};
    
    if (tipo) filtro.tipo = tipo;
    if (estado) filtro.estado = estado;
    
    const deudas = await Deuda.find(filtro).sort({ fecha: -1 });
    
    res.json(deudas);
  } catch (error) {
    console.error('Error obtener deudas:', error);
    res.status(500).json({ error: 'Error al obtener deudas' });
  }
});

// Obtener transacciones de una deuda específica
app.get('/api/deuda/:deudaId/transacciones', verificarToken, async (req, res) => {
  try {
    const { deudaId } = req.params;
    
    const transacciones = await TransaccionDeuda.find({ 
      deudaId: deudaId 
    }).sort({ fecha: -1 });
    
    res.json(transacciones);
  } catch (error) {
    console.error('Error obtener transacciones:', error);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

// Registrar transacción (cargo o abono)
app.post('/api/deuda/transaccion', verificarToken, async (req, res) => {
  try {
    const { deudaId, tipo, monto, razon, empleadoRegistro } = req.body;
    
    if (!deudaId || !tipo || !monto) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    // Buscar deuda
    const deuda = await Deuda.findById(deudaId);
    if (!deuda) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }
    
    // Crear transacción
    const nuevaTransaccion = new TransaccionDeuda({
      deudaId,
      tipo,
      monto,
      razon: razon || 'Sin especificar',
      empleadoRegistro: empleadoRegistro || req.usuario.email,
      fecha: new Date()
    });
    
    await nuevaTransaccion.save();
    
    // Actualizar saldo de la deuda
    if (tipo === 'cargo') {
      deuda.saldo += monto;
      deuda.estado = 'parcial';
    } else if (tipo === 'abono') {
      deuda.saldo -= monto;
      if (deuda.saldo <= 0) {
        deuda.estado = 'pagada';
        deuda.saldo = 0;
      } else {
        deuda.estado = 'parcial';
      }
    }
    
    await deuda.save();
    
    res.status(201).json({
      mensaje: 'Transacción registrada',
      transaccion: nuevaTransaccion,
      nuevoSaldo: deuda.saldo,
      estado: deuda.estado
    });
  } catch (error) {
    console.error('Error registrar transacción:', error);
    res.status(500).json({ error: 'Error al registrar transacción' });
  }
});

// Actualizar estado de deuda
app.put('/api/deuda/:deudaId', verificarToken, async (req, res) => {
  try {
    const { deudaId } = req.params;
    const { estado } = req.body;
    
    const deuda = await Deuda.findByIdAndUpdate(
      deudaId,
      { estado },
      { new: true }
    );
    
    if (!deuda) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }
    
    res.json({
      mensaje: 'Deuda actualizada',
      deuda
    });
  } catch (error) {
    console.error('Error actualizar deuda:', error);
    res.status(500).json({ error: 'Error al actualizar deuda' });
  }
});

// Obtener deudas de un cliente/empleado específico
app.get('/api/deuda/persona/:referencia', verificarToken, async (req, res) => {
  try {
    const { referencia } = req.params;
    
    const deudas = await Deuda.find({ referencia }).sort({ fecha: -1 });
    const deudaPendiente = deudas.reduce((sum, d) => sum + (d.saldo || 0), 0);
    
    res.json({
      deudas,
      totalDeuda: deudaPendiente
    });
  } catch (error) {
    console.error('Error obtener deudas de persona:', error);
    res.status(500).json({ error: 'Error al obtener deudas' });
  }
});

// Datos en memoria (fallback)
let productos = [
  { id: 1, nombre: 'Arroz Diana 500g', cantidad: 50, precio: 2500, codigoBarras: '7702001001234', categoria: 'Granos', imagen: 'https://via.placeholder.com/150x150/667eea/white?text=ARROZ', fechaCreacion: new Date().toISOString() },
  { id: 2, nombre: 'Aceite Gourmet 1L', cantidad: 30, precio: 4500, codigoBarras: '7702002001235', categoria: 'Aceites', imagen: 'https://via.placeholder.com/150x150/28a745/white?text=ACEITE', fechaCreacion: new Date().toISOString() },
  { id: 3, nombre: 'Az�car Incauca 1kg', cantidad: 25, precio: 3200, codigoBarras: '7702003001236', categoria: 'Dulces', imagen: 'https://via.placeholder.com/150x150/ffc107/white?text=AZUCAR', fechaCreacion: new Date().toISOString() }
];
let ventasRegistradas = [];

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

// Inicializar usuarios demo (REMOVED - use scripts/seed-demo.js instead)
// This function has been removed for security reasons.
// Demo users should only be created via manual seed script in development.
// Use: npm run seed:demo

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

app.post('/api/ventas', verificarToken, async (req, res) => {
  try {
    const { items, subtotal, iva, descuentos, total, metodoPago } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe incluir al menos un producto' });
    }

    if (!['efectivo', 'tarjeta', 'transferencia'].includes(metodoPago)) {
      return res.status(400).json({ error: 'Método de pago inválido' });
    }

    const vendedor = await Usuario.findById(req.usuario.id);
    if (!vendedor) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const itemsNormalizados = [];
    const productosMongoActualizados = [];
    const productosMemoriaActualizados = [];

    for (const item of items) {
      const productoId = String(item.productoId || item.producto?.id || '');
      const cantidad = Number(item.cantidad || 0);

      if (!productoId || cantidad <= 0) {
        return res.status(400).json({ error: 'Hay productos inválidos en la venta' });
      }

      if (isMongoReady()) {
        const producto = await Producto.findById(productoId);
        if (!producto) {
          return res.status(404).json({ error: 'Uno de los productos ya no existe' });
        }

        const stockActual = Number(producto.cantidad || 0);
        if (stockActual < cantidad) {
          return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });
        }

        const precioUnitario = Number(item.precioUnitario || producto.precioVenta || producto.precio || 0);
        itemsNormalizados.push({
          productoId,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras || '',
          categoria: producto.categoria || '',
          cantidad,
          precioUnitario,
          subtotal: Number(item.subtotal || cantidad * precioUnitario)
        });
        productosMongoActualizados.push({
          producto,
          nuevaCantidad: stockActual - cantidad
        });
      } else {
        const index = productos.findIndex((producto) => `${producto.id}` === productoId);
        if (index === -1) {
          return res.status(404).json({ error: 'Uno de los productos ya no existe' });
        }

        const producto = productos[index];
        const stockActual = Number(producto.cantidad || 0);
        if (stockActual < cantidad) {
          return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });
        }

        const precioUnitario = Number(item.precioUnitario || producto.precioVenta || producto.precio || 0);
        itemsNormalizados.push({
          productoId,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras || '',
          categoria: producto.categoria || '',
          cantidad,
          precioUnitario,
          subtotal: Number(item.subtotal || cantidad * precioUnitario)
        });
        productosMemoriaActualizados.push({
          index,
          producto,
          nuevaCantidad: stockActual - cantidad
        });
      }
    }

    const ventaPayload = {
      fecha: new Date(),
      items: itemsNormalizados,
      subtotal: Number(subtotal || itemsNormalizados.reduce((sum, item) => sum + item.subtotal, 0)),
      iva: Number(iva || 0),
      descuentos: Number(descuentos || 0),
      total: Number(total || 0),
      metodoPago,
      vendedorId: vendedor._id,
      vendedorNombre: vendedor.nombre,
      vendedorEmail: vendedor.email,
      vendedorRol: vendedor.rol,
      estado: 'completada'
    };

    if (ventaPayload.total <= 0) {
      return res.status(400).json({ error: 'El total de la venta debe ser mayor a cero' });
    }

    if (isMongoReady()) {
      for (const { producto, nuevaCantidad } of productosMongoActualizados) {
        producto.cantidad = nuevaCantidad;
        producto.fechaActualizacion = new Date();
        await producto.save();
        io.emit('producto-actualizado', normalizeProducto(producto));
      }
    } else {
      productosMemoriaActualizados.forEach(({ index, producto, nuevaCantidad }) => {
        productos[index] = {
          ...producto,
          cantidad: nuevaCantidad,
          ultimaActualizacion: new Date().toISOString()
        };
        io.emit('producto-actualizado', normalizeProducto(productos[index]));
      });
    }

    let ventaRegistrada;

    if (isMongoReady()) {
      ventaRegistrada = await Venta.create(ventaPayload);

      const sesionActiva = await SesionCaja.findOne({ estado: 'abierta' }).sort({ fechaApertura: -1 });
      if (sesionActiva) {
        if (metodoPago === 'efectivo') {
          sesionActiva.ventasEfectivo += ventaPayload.total;
        } else if (metodoPago === 'tarjeta') {
          sesionActiva.ventasTarjeta += ventaPayload.total;
        } else {
          sesionActiva.ventasTransferencia += ventaPayload.total;
        }

        await sesionActiva.save();
      }
    } else {
      ventaRegistrada = {
        ...ventaPayload,
        id: Date.now().toString(),
        _id: Date.now().toString()
      };
      ventasRegistradas.unshift(ventaRegistrada);
    }

    const ventaNormalizada = normalizeVenta(ventaRegistrada);
    io.emit('venta-registrada', ventaNormalizada);
    res.status(201).json(ventaNormalizada);
  } catch (error) {
    console.error('Error POST /api/ventas:', error);
    res.status(500).json({ error: 'No se pudo registrar la venta' });
  }
});

app.get('/api/stats', (req, res) => {
  res.json({ productos: productos.length, dispositivos: dispositivosConectados.length, estadisticas });
});

// ========== ENDPOINTS DE ESTADÍSTICAS AVANZADAS ==========

// Estadísticas básicas y avanzadas combinadas
app.get('/api/stats/advanced', (req, res) => {
  try {
    const { periodo = '30d' } = req.query;
    
    // Calcular días según el período
    const dias = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30;
    
    // Generar datos simulados de ventas (en producción vendrían de la DB)
    const ventasData = [];
    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const esFindeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
      const ventasBase = 15 * (esFindeSemana ? 1.3 : 1) * (0.7 + Math.random() * 0.6);
      
      ventasData.push({
        fecha: fecha.toISOString().split('T')[0],
        ventas: Math.round(ventasBase),
        ingresos: Math.round(ventasBase * 8000 + Math.random() * 8000)
      });
    }
    
    // Calcular sumatorias
    const totalVentas = ventasData.reduce((sum, d) => sum + d.ventas, 0);
    const totalIngresos = ventasData.reduce((sum, d) => sum + d.ingresos, 0);
    const promedioDiario = totalVentas / ventasData.length;
    
    // Calcular tendencia
    const mitad = Math.floor(ventasData.length / 2);
    const primeraMitad = ventasData.slice(0, mitad).reduce((sum, d) => sum + d.ventas, 0) / mitad;
    const segundaMitad = ventasData.slice(mitad).reduce((sum, d) => sum + d.ventas, 0) / (ventasData.length - mitad);
    const tendencia = ((segundaMitad - primeraMitad) / primeraMitad * 100).toFixed(2);
    
    res.json({
      periodo,
      ventasData,
      resumen: {
        totalVentas,
        totalIngresos,
        promedioDiario: promedioDiario.toFixed(2),
        tendencia: parseFloat(tendencia),
        periodoVentas: dias
      }
    });
  } catch (error) {
    console.error('Error /api/stats/advanced:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas avanzadas' });
  }
});

// Productos más vendidos
app.get('/api/stats/productos-vendidos', (req, res) => {
  try {
    const { limite = 10 } = req.query;
    
    const productosMasVendidos = [
      { nombre: 'Arroz Diana Premium 500g', cantidad: 45, ingresos: 112500, categoria: 'Granos', margen: 30 },
      { nombre: 'Aceite Gourmet 1L', cantidad: 32, ingresos: 144000, categoria: 'Aceites', margen: 35 },
      { nombre: 'Azúcar Incauca 1kg', cantidad: 28, ingresos: 89600, categoria: 'Endulzantes', margen: 28 },
      { nombre: 'Leche Alpina 1L', cantidad: 52, ingresos: 156000, categoria: 'Lácteos', margen: 25 },
      { nombre: 'Pan Bimbo Integral', cantidad: 38, ingresos: 76000, categoria: 'Panadería', margen: 20 },
      { nombre: 'Huevos AA x30', cantidad: 25, ingresos: 87500, categoria: 'Proteínas', margen: 22 },
      { nombre: 'Pollo Pechuga kg', cantidad: 18, ingresos: 270000, categoria: 'Carnes', margen: 40 },
      { nombre: 'Coca Cola 2L', cantidad: 41, ingresos: 164000, categoria: 'Bebidas', margen: 32 },
      { nombre: 'Café Pasilla x500g', cantidad: 22, ingresos: 110000, categoria: 'Bebidas', margen: 38 },
      { nombre: 'Atún lata 170g', cantidad: 35, ingresos: 70000, categoria: 'Conservas', margen: 29 }
    ].slice(0, parseInt(limite));
    
    res.json(productosMasVendidos);
  } catch (error) {
    console.error('Error /api/stats/productos-vendidos:', error);
    res.status(500).json({ error: 'Error al obtener productos vendidos' });
  }
});

// Estadísticas de deudas
app.get('/api/stats/deudas', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const deudas = await Deuda.find();
      
      const totalDeuda = deudas.reduce((sum, d) => sum + d.saldo, 0);
      const porTipo = {
        clientes: deudas.filter(d => d.tipo === 'cliente').reduce((sum, d) => sum + d.saldo, 0),
        empleados: deudas.filter(d => d.tipo === 'empleado').reduce((sum, d) => sum + d.saldo, 0)
      };
      
      const porEstado = {
        pendiente: deudas.filter(d => d.estado === 'pendiente').length,
        parcial: deudas.filter(d => d.estado === 'parcial').length,
        pagada: deudas.filter(d => d.estado === 'pagada').length
      };
      
      return res.json({
        totalDeuda,
        totalRegistros: deudas.length,
        porTipo,
        porEstado,
        deudas: deudas.slice(0, 5).map(d => ({
          nombrePersona: d.nombrePersona,
          monto: d.monto,
          saldo: d.saldo,
          estado: d.estado,
          tipo: d.tipo,
          fecha: d.fecha
        }))
      });
    }
    
    // Datos en memoria
    res.json({
      totalDeuda: 0,
      totalRegistros: 0,
      porTipo: { clientes: 0, empleados: 0 },
      porEstado: { pendiente: 0, parcial: 0, pagada: 0 },
      deudas: []
    });
  } catch (error) {
    console.error('Error /api/stats/deudas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de deudas' });
  }
});

// Márgenes de ganancia
app.get('/api/stats/margenes', (req, res) => {
  try {
    const margenes = {
      promedio: 30,
      categorias: {
        'Carnes': { margen: 40, ventas: 18 },
        'Bebidas': { margen: 32, ventas: 73 },
        'Lácteos': { margen: 25, ventas: 52 },
        'Granos': { margen: 30, ventas: 45 },
        'Aceites': { margen: 35, ventas: 32 },
        'Panadería': { margen: 20, ventas: 38 },
        'Proteínas': { margen: 22, ventas: 25 },
        'Conservas': { margen: 29, ventas: 35 }
      }
    };
    
    res.json(margenes);
  } catch (error) {
    console.error('Error /api/stats/margenes:', error);
    res.status(500).json({ error: 'Error al obtener márgenes' });
  }
});

// Resumen ejecutivo
app.get('/api/stats/resumen', async (req, res) => {
  try {
    let deudaTotal = 0;
    let registrosDeuda = 0;
    
    if (mongoose.connection.readyState === 1) {
      const deudas = await Deuda.find();
      deudaTotal = deudas.reduce((sum, d) => sum + d.saldo, 0);
      registrosDeuda = deudas.length;
    }
    
    const resumen = {
      fecha: new Date().toISOString(),
      sistema: {
        productosTotal: productos.length,
        dispositivosConectados: dispositivosConectados.length,
        usuariosActivos: 2
      },
      ventas: {
        hoy: Math.round(15 * (0.7 + Math.random() * 0.6)),
        promedioDiario: 15,
        tendencia: (Math.random() * 40 - 20).toFixed(2)
      },
      deudas: {
        totalPendiente: deudaTotal,
        registros: registrosDeuda,
        tasaPago: 85
      },
      salud: {
        stockBajo: Math.floor(Math.random() * 5),
        alertas: Math.floor(Math.random() * 3)
      }
    };
    
    res.json(resumen);
  } catch (error) {
    console.error('Error /api/stats/resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// ========== ENDPOINTS DE REPORTES ==========

// Reporte de ventas por período
app.get('/api/reportes/ventas', async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    if (!inicio || !fin) {
      return res.status(400).json({ error: 'Se requieren fechas inicio y fin' });
    }

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    const ventas = await getVentasEntreFechas(fechaInicio, new Date(`${fin}T23:59:59.999Z`));
    const ventasPorDia = new Map();

    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
      const fecha = d.toISOString().split('T')[0];
      ventasPorDia.set(fecha, {
        fecha,
        cantidad: 0,
        ingresos: 0,
        ticket_promedio: 0,
        productos_vendidos: 0,
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0
      });
    }

    ventas.forEach((venta) => {
      const fecha = new Date(venta.fecha).toISOString().split('T')[0];
      const actual = ventasPorDia.get(fecha);
      if (!actual) {
        return;
      }

      actual.cantidad += 1;
      actual.ingresos += Number(venta.total || 0);
      actual.productos_vendidos += (venta.items || []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0);

      if (venta.metodoPago === 'efectivo') {
        actual.efectivo += Number(venta.total || 0);
      } else if (venta.metodoPago === 'tarjeta') {
        actual.tarjeta += Number(venta.total || 0);
      } else if (venta.metodoPago === 'transferencia') {
        actual.transferencia += Number(venta.total || 0);
      }
    });

    const reportes = Array.from(ventasPorDia.values()).map((dia) => ({
      ...dia,
      ticket_promedio: dia.cantidad > 0 ? Math.round(dia.ingresos / dia.cantidad) : 0
    }));

    res.json(reportes);
  } catch (error) {
    console.error('Error /api/reportes/ventas:', error);
    res.status(500).json({ error: 'Error al obtener reporte de ventas' });
  }
});

// Reporte de productos más vendidos
app.get('/api/reportes/productos', async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
      return res.status(400).json({ error: 'Se requieren fechas inicio y fin' });
    }

    const ventas = await getVentasEntreFechas(new Date(inicio), new Date(`${fin}T23:59:59.999Z`));
    const productosVendidos = new Map();

    ventas.forEach((venta) => {
      (venta.items || []).forEach((item) => {
        const key = String(item.productoId || item.nombre);
        const actual = productosVendidos.get(key) || {
          id: key,
          nombre: item.nombre,
          cantidad: 0,
          ingresos: 0,
          categoria: item.categoria || 'Sin categoría'
        };

        actual.cantidad += Number(item.cantidad || 0);
        actual.ingresos += Number(item.subtotal || 0);
        productosVendidos.set(key, actual);
      });
    });

    res.json(Array.from(productosVendidos.values()).sort((a, b) => b.ingresos - a.ingresos));
  } catch (error) {
    console.error('Error /api/reportes/productos:', error);
    res.status(500).json({ error: 'Error al obtener reporte de productos' });
  }
});

// Reporte de empleados
app.get('/api/reportes/empleados', async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
      return res.status(400).json({ error: 'Se requieren fechas inicio y fin' });
    }

    const ventas = await getVentasEntreFechas(new Date(inicio), new Date(`${fin}T23:59:59.999Z`));
    const empleados = new Map();

    ventas.forEach((venta) => {
      const key = String(venta.vendedorId || venta.vendedorNombre);
      const actual = empleados.get(key) || {
        id: key,
        nombre: venta.vendedorNombre,
        ventas: 0,
        ingresos: 0
      };

      actual.ventas += 1;
      actual.ingresos += Number(venta.total || 0);
      empleados.set(key, actual);
    });

    res.json(Array.from(empleados.values()).sort((a, b) => b.ingresos - a.ingresos));
  } catch (error) {
    console.error('Error /api/reportes/empleados:', error);
    res.status(500).json({ error: 'Error al obtener reporte de empleados' });
  }
});

// Reporte de stock bajo
app.get('/api/reportes/stock-bajo', async (req, res) => {
  try {
    const { dias = 30 } = req.query;

    // Datos simulados de productos con stock bajo
    const stockBajo = [
      { nombre: 'Leche Alpina 1L', cantidad: 5, nivel_minimo: 20, dias_sin_stock: 0 },
      { nombre: 'Pan Bimbo Integral', cantidad: 3, nivel_minimo: 15, dias_sin_stock: 2 },
      { nombre: 'Huevos AA x30', cantidad: 8, nivel_minimo: 25, dias_sin_stock: 0 },
      { nombre: 'Coca Cola 2L', cantidad: 6, nivel_minimo: 30, dias_sin_stock: 1 },
      { nombre: 'Pollo Pechuga kg', cantidad: 2, nivel_minimo: 10, dias_sin_stock: 3 },
      { nombre: 'Arroz Diana Premium 500g', cantidad: 4, nivel_minimo: 15, dias_sin_stock: 0 },
      { nombre: 'Aceite Gourmet 1L', cantidad: 7, nivel_minimo: 20, dias_sin_stock: 1 }
    ];

    res.json(stockBajo);
  } catch (error) {
    console.error('Error /api/reportes/stock-bajo:', error);
    res.status(500).json({ error: 'Error al obtener reporte de stock bajo' });
  }
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
    console.warn('http-proxy-middleware no está instalado; si quieres usar proxy en dev, instala http-proxy-middleware');
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
