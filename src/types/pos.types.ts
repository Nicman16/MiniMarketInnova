// src/types/pos.types.ts

// ============ AUTENTICACIÓN ============
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  contraseña?: string; // No se envía al frontend
  rol: 'jefe' | 'empleado';
  estado: 'activo' | 'inactivo';
  emailVerificado?: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

export interface LoginResponse {
  token: string;
  usuario: Omit<Usuario, 'contraseña'>;
}

// ============ PRODUCTOS ============
export interface Producto {
  id: number | string;
  nombre: string;
  precio?: number;
  precioVenta?: number;
  precioCompra?: number;
  codigoBarras: string;
  cantidad?: number;
  stock?: number;
  categoria: string;
  imagen?: string;
  iva?: number;
  margen?: number;
  proveedor?: string;
  proveedorId?: number;
  stockMinimo?: number;
  ubicacion?: string;
  descripcion?: string;
  estado?: 'activo' | 'descontinuado' | 'agotado';
  fechaCreacion?: string;
  ultimaActualizacion?: string;
  fechaVencimiento?: string;
}

export interface ItemVenta {
  id: number | string;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento?: number;
}

export interface Venta {
  id: string;
  fecha: string;
  items: ItemVenta[];
  subtotal: number;
  iva: number;
  descuentos: number;
  total: number;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  cliente?: Cliente;
  vendedor: Empleado;
  estado: 'pendiente' | 'completada' | 'cancelada';
}

export interface MovimientoCaja {
  id: string;
  tipo: 'ingreso' | 'egreso' | 'venta';
  monto: number;
  concepto: string;
  fecha: string;
  empleado: Empleado;
}

export interface SesionCaja {
  id: string;
  empleado: Empleado;
  fechaApertura: string;
  fechaCierre?: string;
  montoApertura: number;
  montoCierre?: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
  ingresos: number;
  egresos: number;
  estado: 'abierta' | 'cerrada';
}

export interface Empleado {
  id: string;
  nombre: string;
  email: string;
  rol: 'jefe' | 'empleado';
  activo: boolean;
  emailVerificado?: boolean;
  invitacionEnviada?: boolean;
  activationLink?: string;
  pin?: string;
  deudaAcumulada?: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  totalCompras: number;
  deudaTotal: number;
  fechaRegistro: string;
}

// ============ FIADO / DEUDA ============
export interface Deuda {
  id: string;
  tipo: 'cliente' | 'empleado'; // Fiado de cliente o consumo de empleado
  referencia: string; // ID del cliente o empleado
  nombrePersona: string;
  monto: number;
  razon: string; // "Compra de productos", "Consumo personal", etc.
  fecha: string;
  estado: 'pendiente' | 'parcial' | 'pagada';
  saldo: number; // Monto pendiente por pagar
}

export interface TransaccionDeuda {
  id: string;
  deudaId: string;
  tipo: 'cargo' | 'abono'; // Cargo (se lleva algo) o Abono (paga)
  monto: number;
  fecha: string;
  razon: string;
  empleadoRegistro: string; // Quién registró la transacción
  comprobante?: ComprobanteEvidencia;
}

export interface ComprobanteEvidencia {
  id: string;
  transaccionId: string;
  foto: string; // URL o base64 de la foto
  descripcion?: string;
  fechaCarga: string;
  tipoComprobante: 'foto_pago' | 'recibo' | 'ticket';
}

// ============ SESIÓN DE USUARIO ============
export interface SesionUsuario {
  usuario: Omit<Usuario, 'contraseña'>;
  token: string;
  fechaLogin: string;
}