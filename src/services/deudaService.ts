// src/services/deudaService.ts
import { Deuda, TransaccionDeuda } from '../types/pos.types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class DeudaService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Crear nueva deuda
  async crearDeuda(datos: {
    tipo: 'cliente' | 'empleado';
    referencia: string;
    nombrePersona: string;
    monto: number;
    razon: string;
  }): Promise<Deuda> {
    const response = await fetch(`${API_BASE}/api/deuda/crear`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear deuda');
    }

    const { deuda } = await response.json();
    return deuda;
  }

  // Obtener todas las deudas con filtro opcional
  async obtenerDeudas(tipo?: 'cliente' | 'empleado', estado?: string): Promise<Deuda[]> {
    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    if (estado) params.append('estado', estado);

    const response = await fetch(
      `${API_BASE}/api/deuda/lista${params.toString() ? '?' + params.toString() : ''}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener deudas');
    }

    return await response.json();
  }

  // Obtener deudas de un cliente/empleado específico
  async obtenerDeudasPersona(referencia: string): Promise<{
    deudas: Deuda[];
    totalDeuda: number;
  }> {
    const response = await fetch(
      `${API_BASE}/api/deuda/persona/${referencia}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener deudas de la persona');
    }

    return await response.json();
  }

  // Obtener transacciones de una deuda
  async obtenerTransacciones(deudaId: string): Promise<TransaccionDeuda[]> {
    const response = await fetch(
      `${API_BASE}/api/deuda/${deudaId}/transacciones`,
      {
        method: 'GET',
        headers: this.getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener transacciones');
    }

    return await response.json();
  }

  // Registrar una transacción (cargo o abono)
  async registrarTransaccion(transaccionData: {
    deudaId: string;
    tipo: 'cargo' | 'abono';
    monto: number;
    razon: string;
    empleadoRegistro?: string;
  }): Promise<{
    transaccion: TransaccionDeuda;
    nuevoSaldo: number;
    estado: string;
  }> {
    const response = await fetch(`${API_BASE}/api/deuda/transaccion`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(transaccionData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al registrar transacción');
    }

    return await response.json();
  }

  // Actualizar estado de deuda
  async actualizarEstadoDeuda(deudaId: string, nuevoEstado: string): Promise<Deuda> {
    const response = await fetch(`${API_BASE}/api/deuda/${deudaId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (!response.ok) {
      throw new Error('Error al actualizar deuda');
    }

    const { deuda } = await response.json();
    return deuda;
  }
}

export const deudaService = new DeudaService();
