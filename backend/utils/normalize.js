// Funciones que convierten documentos de MongoDB a objetos limpios para la API

const normalizeProducto = (producto) => {
  if (!producto) return producto;
  const obj = producto.toObject ? producto.toObject() : producto;
  return { ...obj, id: obj.id?.toString?.() || obj._id?.toString?.() || obj.id || obj._id || null };
};

const normalizeEmpleado = (usuarioDoc) => {
  if (!usuarioDoc) return null;
  const u = usuarioDoc.toObject ? usuarioDoc.toObject() : usuarioDoc;
  return {
    id: u._id?.toString?.() || u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.estado === 'activo',
    emailVerificado: !!u.emailVerificado,
    invitacionEnviada: !!u.invitacionEnviada,
    activationLink: u.activationLink,
    pin: u.pin || '',
    fechaCreacion: u.fechaCreacion,
    ultimoAcceso: u.ultimoAcceso
  };
};

const normalizeSesionCaja = (sesionDoc) => {
  if (!sesionDoc) return null;
  const s = sesionDoc.toObject ? sesionDoc.toObject() : sesionDoc;
  return {
    id: s._id?.toString?.() || s.id,
    empleado: { id: s.empleadoId?.toString?.() || s.empleadoId, nombre: s.empleadoNombre, email: s.empleadoEmail, rol: s.empleadoRol, activo: true },
    fechaApertura: s.fechaApertura,
    fechaCierre: s.fechaCierre,
    montoApertura: s.montoApertura,
    montoCierre: s.montoCierre,
    ventasEfectivo: s.ventasEfectivo || 0,
    ventasTarjeta: s.ventasTarjeta || 0,
    ventasTransferencia: s.ventasTransferencia || 0,
    ingresos: s.ingresos || 0,
    egresos: s.egresos || 0,
    estado: s.estado
  };
};

const normalizeMovimientoCaja = (movimientoDoc) => {
  if (!movimientoDoc) return null;
  const m = movimientoDoc.toObject ? movimientoDoc.toObject() : movimientoDoc;
  return {
    id: m._id?.toString?.() || m.id,
    tipo: m.tipo,
    monto: m.monto,
    concepto: m.concepto,
    fecha: m.fecha,
    empleado: { id: m.empleadoId?.toString?.() || m.empleadoId, nombre: m.empleadoNombre, email: m.empleadoEmail, rol: m.empleadoRol, activo: true }
  };
};

const normalizeVenta = (ventaDoc) => {
  if (!ventaDoc) return null;
  const v = ventaDoc.toObject ? ventaDoc.toObject() : ventaDoc;
  return {
    id: v._id?.toString?.() || v.id,
    fecha: v.fecha,
    items: (v.items || []).map((item) => ({
      productoId: item.productoId, nombre: item.nombre, codigoBarras: item.codigoBarras,
      categoria: item.categoria, cantidad: item.cantidad, precioUnitario: item.precioUnitario, subtotal: item.subtotal
    })),
    subtotal: v.subtotal,
    iva: v.iva || 0,
    descuentos: v.descuentos || 0,
    total: v.total,
    metodoPago: v.metodoPago,
    vendedor: { id: v.vendedorId?.toString?.() || v.vendedorId, nombre: v.vendedorNombre, email: v.vendedorEmail, rol: v.vendedorRol, activo: true },
    estado: v.estado
  };
};

module.exports = { normalizeProducto, normalizeEmpleado, normalizeSesionCaja, normalizeMovimientoCaja, normalizeVenta };
