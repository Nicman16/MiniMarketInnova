import { collection, doc, getDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { Producto } from '../../types/pos.types';
import { db } from '../shared/firebaseClient';
import { fetchApiJson } from '../shared/httpClient';

interface ProductoRegistroPayload {
  nombre: string;
  codigoBarras: string;
  stock: number;
  precioPorKilo: number;
  fechaVencimiento: string;
}

const PRODUCTOS_COLLECTION = 'productos';

const toIsoDate = (value: unknown): string | undefined => {
  if (!value) return undefined;

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (typeof value === 'object' && value !== null && 'seconds' in (value as Record<string, unknown>)) {
    const seconds = Number((value as { seconds: unknown }).seconds);
    if (!Number.isNaN(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }

  return undefined;
};

const parseDateInputToTimestamp = (dateInput: string): Timestamp => {
  const [year, month, day] = dateInput.split('-').map(Number);
  // Usar setFullYear explícito para preservar años con menos de 4 dígitos.
  // new Date(year, ...) interpreta años 0-99 como 1900+year, lo que corrompe fechas.
  const d = new Date(0);
  d.setFullYear(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
};

const mapDocToProducto = (id: string, data: Record<string, unknown>): Producto => {
  const stock = Number(data.stock ?? data.cantidad ?? 0);
  const precioPorKilo = Number(data.precioPorKilo ?? data.precioCompra ?? data.precio ?? 0);
  const precioVenta = Number(data.precioVenta ?? precioPorKilo);

  return {
    id,
    nombre: String(data.nombre ?? ''),
    codigoBarras: String(data.codigoBarras ?? id),
    categoria: String(data.categoria ?? 'Sin categoria'),
    stock,
    stockMinimo: Number(data.stockMinimo ?? 5),
    precioCompra: precioPorKilo,
    precioVenta,
    margen: precioPorKilo > 0 ? ((precioVenta - precioPorKilo) / precioPorKilo) * 100 : 0,
    proveedor: String(data.proveedor ?? 'Sin proveedor'),
    proveedorId: Number(data.proveedorId ?? 0),
    ubicacion: String(data.ubicacion ?? 'Por definir'),
    descripcion: String(data.descripcion ?? ''),
    imagen: String(data.imagen ?? ''),
    estado: (data.estado as Producto['estado']) ?? 'activo',
    fechaVencimiento: toIsoDate(data.fechaVencimiento),
    fechaCreacion: toIsoDate(data.fechaCreacion) ?? new Date().toISOString(),
    ultimaActualizacion: toIsoDate(data.ultimaActualizacion) ?? new Date().toISOString()
  };
};

export const inventarioFirestoreService = {
  async existeProductoPorCodigo(codigoBarras: string): Promise<Producto | null> {
    const normalizedCode = codigoBarras.trim();
    if (!normalizedCode) return null;

    if (!db) {
      const productos = await fetchApiJson<Producto[]>('/api/tienda/productos');
      return productos.find((producto) => producto.codigoBarras === normalizedCode) ?? null;
    }

    const docRef = doc(db, PRODUCTOS_COLLECTION, normalizedCode);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;
    return mapDocToProducto(snap.id, snap.data() as Record<string, unknown>);
  },

  async listarProductos(): Promise<Producto[]> {
    if (!db) {
      return fetchApiJson<Producto[]>('/api/tienda/productos');
    }

    const snap = await getDocs(collection(db, PRODUCTOS_COLLECTION));
    return snap.docs.map((item) => mapDocToProducto(item.id, item.data() as Record<string, unknown>));
  },

  async guardarProducto(payload: ProductoRegistroPayload): Promise<Producto> {
    const codigoBarras = payload.codigoBarras.trim();
    if (!codigoBarras) {
      throw new Error('El codigo de barras es obligatorio.');
    }

    if (!payload.fechaVencimiento) {
      throw new Error('La fecha de vencimiento es obligatoria.');
    }

    if (!db) {
      return fetchApiJson<Producto>('/api/tienda/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: payload.nombre,
          codigoBarras,
          stock: Number(payload.stock ?? 0),
          cantidad: Number(payload.stock ?? 0),
          precioPorKilo: Number(payload.precioPorKilo ?? 0),
          precioCompra: Number(payload.precioPorKilo ?? 0),
          precioVenta: Number(payload.precioPorKilo ?? 0),
          precio: Number(payload.precioPorKilo ?? 0),
          fechaVencimiento: payload.fechaVencimiento
        })
      });
    }

    const now = Timestamp.now();
    const docRef = doc(db, PRODUCTOS_COLLECTION, codigoBarras);

    const dataToSave = {
      nombre: payload.nombre.trim(),
      codigoBarras,
      stock: Number(payload.stock ?? 0),
      cantidad: Number(payload.stock ?? 0),
      precioPorKilo: Number(payload.precioPorKilo ?? 0),
      precioCompra: Number(payload.precioPorKilo ?? 0),
      precioVenta: Number(payload.precioPorKilo ?? 0),
      categoria: 'Sin categoria',
      proveedor: 'Sin proveedor',
      estado: 'activo' as const,
      fechaVencimiento: parseDateInputToTimestamp(payload.fechaVencimiento),
      fechaCreacion: now,
      ultimaActualizacion: now
    };

    await setDoc(docRef, dataToSave, { merge: true });

    const saved = await getDoc(docRef);
    return mapDocToProducto(saved.id, saved.data() as Record<string, unknown>);
  }
};
