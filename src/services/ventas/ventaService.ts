import { ItemVenta, Venta } from '../../types/pos.types';
import { buildApiUrl } from '../shared/apiConfig';

interface RegistrarVentaPayload {
  items: ItemVenta[];
  subtotal: number;
  iva: number;
  descuentos: number;
  total: number;
  metodoPago: 'efectivo' | 'nequi' | 'datafono';
}

class VentaService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const serverMsg = errorBody?.error || errorBody?.message || errorBody?.detail;
      throw new Error(serverMsg || `Error ${response.status} al registrar venta`);
    }

    return response.json();
  }

  private getUrl(path: string): string {
    return buildApiUrl(path);
  }

  async registrarVenta(payload: RegistrarVentaPayload): Promise<Venta> {
    return this.request<Venta>(this.getUrl('/api/ventas'), {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        items: payload.items.map((item) => ({
          productoId: item.producto.id,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal
        }))
      })
    });
  }
}

export const ventaService = new VentaService();