// src/types/pos.types.ts
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
  id: number;
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
  ingresos: number;
  egresos: number;
  estado: 'abierta' | 'cerrada';
}

export interface Empleado {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'vendedor' | 'supervisor';
  activo: boolean;
  pin?: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  totalCompras: number;
}