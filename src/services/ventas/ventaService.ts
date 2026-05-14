import { ItemVenta, Venta } from '../../types/pos.types';
import { apiClient } from '../shared/apiConfig';

interface RegistrarVentaPayload {
  items: ItemVenta[];
  subtotal: number;
  iva: number;
  descuentos: number;
  total: number;
  metodoPago: 'efectivo' | 'nequi' | 'datafono';
}

class VentaService {
  async registrarVenta(payload: RegistrarVentaPayload): Promise<Venta> {
    const response = await apiClient.post<Venta>('/api/ventas', {
      ...payload,
      items: payload.items.map((item) => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      }))
    });
    return response.data;
  }
}

export const ventaService = new VentaService();