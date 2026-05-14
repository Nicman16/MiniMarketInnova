import { Empleado } from '../../types/pos.types';
import { apiClient } from '../shared/apiConfig';

type EmpleadoPayload = {
  nombre: string;
  email: string;
  rol: 'jefe' | 'empleado';
  pin?: string;
};

class AuthService {
  private toEmpleado(data: any): Empleado {
    return {
      id: String(data.id || data._id),
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      activo: typeof data.activo === 'boolean' ? data.activo : data.estado === 'activo',
      emailVerificado: !!data.emailVerificado,
      invitacionEnviada: !!data.invitacionEnviada,
      activationLink: data.activationLink,
      pin: data.pin || ''
    };
  }

  async obtenerEmpleadoActual(): Promise<Empleado | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const response = await apiClient.get<any>('/api/auth/me');
      return this.toEmpleado(response.data);
    } catch {
      return null;
    }
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
    const response = await apiClient.get<any[]>('/api/empleados');
    return response.data.map((empleado) => this.toEmpleado(empleado));
  }

  async obtenerEmpleadosActivos(): Promise<Empleado[]> {
    const empleados = await this.obtenerEmpleados();
    return empleados.filter((empleado) => empleado.activo);
  }

  async crearEmpleado(datos: EmpleadoPayload): Promise<Empleado> {
    const response = await apiClient.post<any>('/api/empleados', datos);
    return this.toEmpleado(response.data);
  }

  async actualizarEmpleado(empleado: Empleado): Promise<Empleado> {
    const response = await apiClient.put<any>(`/api/empleados/${empleado.id}`, {
      nombre: empleado.nombre,
      email: empleado.email,
      rol: empleado.rol,
      pin: empleado.pin,
      activo: empleado.activo
    });
    return this.toEmpleado(response.data);
  }

  async toggleEstadoEmpleado(empleadoId: string): Promise<Empleado> {
    const response = await apiClient.patch<any>(`/api/empleados/${empleadoId}/toggle-estado`);
    return this.toEmpleado(response.data);
  }

  async eliminarEmpleado(empleadoId: string): Promise<void> {
    await apiClient.delete(`/api/empleados/${empleadoId}`);
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