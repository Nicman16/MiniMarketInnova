// src/services/inventario/productoService.ts
import { Producto } from '../../types/pos.types';

export const productoService = {
  // Obtener todos los productos
  async obtenerProductos(): Promise<Producto[]> {
    try {
      const response = await fetch('/api/tienda/productos');
      if (!response.ok) throw new Error('Error al obtener productos');
      return await response.json();
    } catch (error) {
      console.error('Error en obtenerProductos:', error);
      return [];
    }
  },

  // Obtener productos por categoría
  async obtenerProductosPorCategoria(categoria: string): Promise<Producto[]> {
    try {
      const response = await fetch(`/api/tienda/productos?categoria=${encodeURIComponent(categoria)}`);
      if (!response.ok) throw new Error('Error al obtener productos');
      return await response.json();
    } catch (error) {
      console.error('Error en obtenerProductosPorCategoria:', error);
      return [];
    }
  },

  // Crear nuevo producto
  async crearProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
    try {
      const response = await fetch('/api/tienda/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
      });
      if (!response.ok) throw new Error('Error al crear producto');
      return await response.json();
    } catch (error) {
      console.error('Error en crearProducto:', error);
      throw error;
    }
  },

  // Actualizar producto
  async actualizarProducto(id: string | number, cambios: Partial<Producto>): Promise<Producto> {
    try {
      const response = await fetch(`/api/tienda/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios)
      });
      if (!response.ok) throw new Error('Error al actualizar producto');
      return await response.json();
    } catch (error) {
      console.error('Error en actualizarProducto:', error);
      throw error;
    }
  },

  // Buscar producto por código de barras
  async buscarPorCodigoBarras(codigo: string): Promise<Producto | null> {
    try {
      const productos = await this.obtenerProductos();
      return productos.find(p => p.codigoBarras === codigo) || null;
    } catch (error) {
      console.error('Error en buscarPorCodigoBarras:', error);
      return null;
    }
  },

  // Buscar productos
  async buscarProductos(termino: string): Promise<Producto[]> {
    try {
      const productos = await this.obtenerProductos();
      const terminoLower = termino.toLowerCase();
      return productos.filter(p =>
        p.nombre.toLowerCase().includes(terminoLower) ||
        p.categoria?.toLowerCase().includes(terminoLower) ||
        p.codigoBarras?.includes(termino)
      );
    } catch (error) {
      console.error('Error en buscarProductos:', error);
      return [];
    }
  }
};
