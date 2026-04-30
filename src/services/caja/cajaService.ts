import { SesionCaja, MovimientoCaja, Empleado } from '../../types/pos.types';
import { getApiBase } from '../shared/apiConfig';

class CajaService {
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

  private toEmpleado(data: any): Empleado {
    return {
      id: String(data.id || data._id),
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      activo: typeof data.activo === 'boolean' ? data.activo : data.estado === 'activo',
      pin: data.pin || ''
    };
  }

  private toSesionCaja(data: any): SesionCaja {
    return {
      id: String(data.id || data._id),
      empleado: this.toEmpleado(data.empleado),
      fechaApertura: data.fechaApertura,
      fechaCierre: data.fechaCierre,
      montoApertura: Number(data.montoApertura || 0),
      montoCierre: data.montoCierre ? Number(data.montoCierre) : undefined,
      ventasEfectivo: Number(data.ventasEfectivo || 0),
      ventasTarjeta: Number(data.ventasTarjeta || 0),
      ventasTransferencia: Number(data.ventasTransferencia || 0),
      ingresos: Number(data.ingresos || 0),
      egresos: Number(data.egresos || 0),
      estado: data.estado
    };
  }

  private toMovimientoCaja(data: any): MovimientoCaja {
    return {
      id: String(data.id || data._id),
      tipo: data.tipo,
      monto: Number(data.monto || 0),
      concepto: data.concepto,
      fecha: data.fecha,
      empleado: this.toEmpleado(data.empleado)
    };
  }

  async obtenerEmpleados(): Promise<Empleado[]> {
    const empleados = await this.request<any[]>(this.getUrl('/api/empleados'));
    return empleados.map((empleado) => this.toEmpleado(empleado));
  }

  async obtenerSesionActiva(): Promise<SesionCaja | null> {
    const sesion = await this.request<any | null>(this.getUrl('/api/caja/sesion-activa'));
    return sesion ? this.toSesionCaja(sesion) : null;
  }

  async abrirCaja(datos: { empleadoId: string; pin: string; montoApertura: number }): Promise<SesionCaja> {
    const sesion = await this.request<any>(this.getUrl('/api/caja/abrir'), {
      method: 'POST',
      body: JSON.stringify(datos)
    });

    return this.toSesionCaja(sesion);
  }

  async cerrarCaja(sesionId: string, montoCierre: number): Promise<SesionCaja> {
    const sesion = await this.request<any>(this.getUrl(`/api/caja/${sesionId}/cerrar`), {
      method: 'POST',
      body: JSON.stringify({ montoCierre })
    });

    return this.toSesionCaja(sesion);
  }

  async registrarMovimiento(datos: {
    tipo: 'ingreso' | 'egreso';
    monto: number;
    concepto: string;
    empleado: Empleado;
  }): Promise<MovimientoCaja> {
    const movimiento = await this.request<any>(this.getUrl('/api/caja/movimiento'), {
      method: 'POST',
      body: JSON.stringify({
        tipo: datos.tipo,
        monto: datos.monto,
        concepto: datos.concepto,
        empleadoId: datos.empleado.id
      })
    });

    return this.toMovimientoCaja(movimiento);
  }

  async obtenerMovimientosDia(fecha?: string): Promise<MovimientoCaja[]> {
    const fechaBuscar = fecha || new Date().toISOString().split('T')[0];
    const movimientos = await this.request<any[]>(this.getUrl(`/api/caja/movimientos?fecha=${fechaBuscar}`));
    return movimientos.map((movimiento) => this.toMovimientoCaja(movimiento));
  }

  async obtenerResumenDia(fecha?: string): Promise<any> {
    const fechaBuscar = fecha || new Date().toISOString().split('T')[0];
    return this.request<any>(this.getUrl(`/api/caja/resumen?fecha=${fechaBuscar}`));
  }

  async obtenerResumenParaCierre(): Promise<any> {
    return this.request<any>(this.getUrl('/api/caja/resumen-cierre'));
  }
}

export const cajaService = new CajaService();