import { ItemVenta, Venta } from '../../types/pos.types';
import { getApiBase } from '../shared/apiConfig';

interface RegistrarVentaPayload {
  items: ItemVenta[];
  subtotal: number;
  iva: number;
  descuentos: number;
  total: number;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia';
}

class VentaService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');

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
      throw new Error(errorBody?.error || `Error en ${options.method || 'GET'} ${url}`);
    }

    return response.json();
  }

  private getUrl(path: string): string {
    return `${getApiBase()}${path}`;
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