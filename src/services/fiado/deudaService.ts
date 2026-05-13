import { Deuda, TransaccionDeuda } from '../../types/pos.types';
import { fetchApiJson } from '../shared/httpClient';

class DeudaService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  async crearDeuda(datos: {
    tipo: 'cliente' | 'empleado';
    referencia: string;
    nombrePersona: string;
    monto: number;
    razon: string;
  }): Promise<Deuda> {
    const payload = await fetchApiJson<{ deuda: Deuda }>('/api/deuda/crear', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(datos)
    });

    return payload.deuda;
  }

  async obtenerDeudas(tipo?: 'cliente' | 'empleado', estado?: string): Promise<Deuda[]> {
    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    if (estado) params.append('estado', estado);

    return fetchApiJson<Deuda[]>(`/api/deuda/lista${params.toString() ? `?${params.toString()}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
  }

  async obtenerDeudasPersona(referencia: string): Promise<{ deudas: Deuda[]; totalDeuda: number }> {
    return fetchApiJson<{ deudas: Deuda[]; totalDeuda: number }>(`/api/deuda/persona/${referencia}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
  }

  async obtenerTransacciones(deudaId: string): Promise<TransaccionDeuda[]> {
    return fetchApiJson<TransaccionDeuda[]>(`/api/deuda/${deudaId}/transacciones`, {
      method: 'GET',
      headers: this.getHeaders()
    });
  }

  async registrarTransaccion(transaccionData: {
    deudaId: string;
    tipo: 'cargo' | 'abono';
    monto: number;
    razon: string;
    empleadoRegistro?: string;
  }): Promise<{ transaccion: TransaccionDeuda; nuevoSaldo: number; estado: string }> {
    return fetchApiJson<{ transaccion: TransaccionDeuda; nuevoSaldo: number; estado: string }>('/api/deuda/transaccion', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(transaccionData)
    });
  }

  async actualizarEstadoDeuda(deudaId: string, nuevoEstado: string): Promise<Deuda> {
    const payload = await fetchApiJson<{ deuda: Deuda }>(`/api/deuda/${deudaId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ estado: nuevoEstado })
    });

    return payload.deuda;
  }
}

export const deudaService = new DeudaService();