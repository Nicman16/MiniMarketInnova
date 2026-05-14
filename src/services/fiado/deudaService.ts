import { Deuda, TransaccionDeuda } from '../../types/pos.types';
import { apiClient } from '../shared/apiConfig';

class DeudaService {
  async crearDeuda(datos: {
    tipo: 'cliente' | 'empleado';
    referencia: string;
    nombrePersona: string;
    monto: number;
    razon: string;
  }): Promise<Deuda> {
    const response = await apiClient.post<{ deuda: Deuda }>('/api/deuda/crear', datos);
    return response.data.deuda;
  }

  async obtenerDeudas(tipo?: 'cliente' | 'empleado', estado?: string): Promise<Deuda[]> {
    const params: Record<string, string> = {};
    if (tipo) params['tipo'] = tipo;
    if (estado) params['estado'] = estado;

    try {
      const response = await apiClient.get<Deuda[] | { error?: string; message?: string }>(
        '/api/deuda/lista',
        { params }
      );
      const resultado = response.data;

      if (Array.isArray(resultado)) return resultado;

      if (typeof resultado === 'object' && resultado && ('error' in resultado || 'message' in resultado)) {
        const errorMsg = (resultado as any).error || (resultado as any).message || 'Error desconocido';
        throw new Error(errorMsg);
      }

      return [];
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error('No autenticado. Por favor inicie sesión nuevamente.');
      }
      throw error;
    }
  }

  async obtenerDeudasPersona(referencia: string): Promise<{ deudas: Deuda[]; totalDeuda: number }> {
    const response = await apiClient.get<{ deudas: Deuda[]; totalDeuda: number }>(
      `/api/deuda/persona/${referencia}`
    );
    return response.data;
  }

  async obtenerTransacciones(deudaId: string): Promise<TransaccionDeuda[]> {
    const response = await apiClient.get<TransaccionDeuda[]>(`/api/deuda/${deudaId}/transacciones`);
    return response.data;
  }

  async registrarTransaccion(transaccionData: {
    deudaId: string;
    tipo: 'cargo' | 'abono';
    monto: number;
    razon: string;
    empleadoRegistro?: string;
  }): Promise<{ transaccion: TransaccionDeuda; nuevoSaldo: number; estado: string }> {
    const response = await apiClient.post<{ transaccion: TransaccionDeuda; nuevoSaldo: number; estado: string }>(
      '/api/deuda/transaccion',
      transaccionData
    );
    return response.data;
  }

  async actualizarEstadoDeuda(deudaId: string, nuevoEstado: string): Promise<Deuda> {
    const response = await apiClient.put<{ deuda: Deuda }>(`/api/deuda/${deudaId}`, { estado: nuevoEstado });
    return response.data.deuda;
  }
}

export const deudaService = new DeudaService();