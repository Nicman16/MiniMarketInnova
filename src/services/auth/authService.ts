import { Empleado } from '../../types/pos.types';
import { getApiBase } from '../shared/apiConfig';

type EmpleadoPayload = {
  nombre: string;
  email: string;
  rol: 'jefe' | 'empleado';
  pin?: string;
};

class AuthService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  private getUrl(path: string): string {
    return `${getApiBase()}${path}`;
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

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
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

  async obtenerEmpleadoActual(): Promise<Empleado | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const usuario = await this.request<any>(this.getUrl('/api/auth/me'));
    return this.toEmpleado(usuario);
  }

  async estaAutenticado(): Promise<boolean> {
    return !!localStorage.getItem('token');
  }

  async tienePermiso(accion: string): Promise<boolean> {
    const empleadoActual = await this.obtenerEmpleadoActual();
    if (!empleadoActual) return false;

    const permisos: Record<Empleado['rol'], string[]> = {
      jefe: ['*'],
      empleado: ['ventas', 'inventario.ver', 'caja.ver']
    };

    const permisosRol = permisos[empleadoActual.rol] || [];
    return permisosRol.includes('*') || permisosRol.includes(accion);
  }

  async obtenerEmpleados(): Promise<Empleado[]> {
    const empleados = await this.request<any[]>(this.getUrl('/api/empleados'));
    return empleados.map((empleado) => this.toEmpleado(empleado));
  }

  async obtenerEmpleadosActivos(): Promise<Empleado[]> {
    const empleados = await this.obtenerEmpleados();
    return empleados.filter((empleado) => empleado.activo);
  }

  async crearEmpleado(datos: EmpleadoPayload): Promise<Empleado> {
    const empleado = await this.request<any>(this.getUrl('/api/empleados'), {
      method: 'POST',
      body: JSON.stringify(datos)
    });

    return this.toEmpleado(empleado);
  }

  async actualizarEmpleado(empleado: Empleado): Promise<Empleado> {
    const empleadoActualizado = await this.request<any>(this.getUrl(`/api/empleados/${empleado.id}`), {
      method: 'PUT',
      body: JSON.stringify({
        nombre: empleado.nombre,
        email: empleado.email,
        rol: empleado.rol,
        pin: empleado.pin,
        activo: empleado.activo
      })
    });

    return this.toEmpleado(empleadoActualizado);
  }

  async toggleEstadoEmpleado(empleadoId: string): Promise<Empleado> {
    const empleado = await this.request<any>(this.getUrl(`/api/empleados/${empleadoId}/toggle-estado`), {
      method: 'PATCH'
    });

    return this.toEmpleado(empleado);
  }

  async eliminarEmpleado(empleadoId: string): Promise<void> {
    await this.request<void>(this.getUrl(`/api/empleados/${empleadoId}`), {
      method: 'DELETE'
    });
  }

  async cambiarPin(nuevoPin: string): Promise<void> {
    const empleadoActual = await this.obtenerEmpleadoActual();
    if (!empleadoActual) {
      throw new Error('No hay empleado autenticado');
    }

    await this.actualizarEmpleado({
      ...empleadoActual,
      pin: nuevoPin
    });
  }

  async obtenerEstadisticasEmpleados(): Promise<any> {
    const [empleados, empleadoActual] = await Promise.all([
      this.obtenerEmpleados(),
      this.obtenerEmpleadoActual()
    ]);

    return {
      totalEmpleados: empleados.length,
      empleadosActivos: empleados.filter((empleado) => empleado.activo).length,
      empleadosInactivos: empleados.filter((empleado) => !empleado.activo).length,
      porRol: {
        jefe: empleados.filter((empleado) => empleado.rol === 'jefe').length,
        empleado: empleados.filter((empleado) => empleado.rol === 'empleado').length
      },
      empleadoActual
    };
  }
}

export const authService = new AuthService();