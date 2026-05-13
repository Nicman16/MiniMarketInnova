import { Producto } from '../../types/pos.types';
import { fetchApiJson } from '../shared/httpClient';

export const productoService = {
  async obtenerProductos(): Promise<Producto[]> {
    try {
      return await fetchApiJson<Producto[]>('/api/tienda/productos');
    } catch (error) {
      console.error('Error en obtenerProductos:', error);
      return [];
    }
  },

  async obtenerProductosPorCategoria(categoria: string): Promise<Producto[]> {
    try {
      return await fetchApiJson<Producto[]>(`/api/tienda/productos?categoria=${encodeURIComponent(categoria)}`);
    } catch (error) {
      console.error('Error en obtenerProductosPorCategoria:', error);
      return [];
    }
  },

  async crearProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
    try {
      return await fetchApiJson<Producto>('/api/tienda/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
      });
    } catch (error) {
      console.error('Error en crearProducto:', error);
      throw error;
    }
  },

  async actualizarProducto(id: string | number, cambios: Partial<Producto>): Promise<Producto> {
    try {
      return await fetchApiJson<Producto>(`/api/tienda/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios)
      });
    } catch (error) {
      console.error('Error en actualizarProducto:', error);
      throw error;
    }
  },

  async buscarPorCodigoBarras(codigo: string): Promise<Producto | null> {
    try {
      const productos = await this.obtenerProductos();
      return productos.find((p) => p.codigoBarras === codigo) || null;
    } catch (error) {
      console.error('Error en buscarPorCodigoBarras:', error);
      return null;
    }
  },

  async buscarProductos(termino: string): Promise<Producto[]> {
    try {
      const productos = await this.obtenerProductos();
      const terminoLower = termino.toLowerCase();
      return productos.filter((p) =>
        p.nombre.toLowerCase().includes(terminoLower)
        || p.categoria?.toLowerCase().includes(terminoLower)
        || p.codigoBarras?.includes(termino)
      );
    } catch (error) {
      console.error('Error en buscarProductos:', error);
      return [];
    }
  }
};