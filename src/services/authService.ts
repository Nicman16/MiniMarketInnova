// src/services/authService.ts
import { Empleado } from '../types/pos.types';
import { syncService } from './syncService';

class AuthService {
  private empleadoActual: Empleado | null = null;
  private empleados: Empleado[] = [];

  constructor() {
    this.cargarDatos();
    this.inicializarEmpleadosDemo();
  }

  private cargarDatos() {
    const empleadosGuardados = localStorage.getItem('minimarket-empleados');
    if (empleadosGuardados) {
      this.empleados = JSON.parse(empleadosGuardados);
    }

    const empleadoActualGuardado = localStorage.getItem('minimarket-empleado-actual');
    if (empleadoActualGuardado) {
      this.empleadoActual = JSON.parse(empleadoActualGuardado);
    }
  }

  private guardarDatos() {
    localStorage.setItem('minimarket-empleados', JSON.stringify(this.empleados));
    
    if (this.empleadoActual) {
      localStorage.setItem('minimarket-empleado-actual', JSON.stringify(this.empleadoActual));
    } else {
      localStorage.removeItem('minimarket-empleado-actual');
    }
  }

  private inicializarEmpleadosDemo() {
    if (this.empleados.length === 0) {
      this.empleados = [
        {
          id: 'jefe-001',
          nombre: 'Jefe de Tienda',
          email: 'jefe@minimarket.com',
          rol: 'jefe',
          activo: true,
          pin: '1234'
        },
        {
          id: 'empleado-001',
          nombre: 'María González',
          email: 'maria@minimarket.com',
          rol: 'empleado',
          activo: true,
          pin: '5678'
        },
        {
          id: 'empleado-002',
          nombre: 'Carlos Rodríguez',
          email: 'carlos@minimarket.com',
          rol: 'empleado',
          activo: true,
          pin: '9999'
        },
        {
          id: 'empleado-003',
          nombre: 'Ana López',
          email: 'ana@minimarket.com',
          rol: 'empleado',
          activo: true,
          pin: '0000'
        }
      ];
      this.guardarDatos();
    }
  }

  async login(empleadoId: string, pin: string): Promise<Empleado> {
    const empleado = this.empleados.find(e => e.id === empleadoId && e.activo);
    
    if (!empleado) {
      throw new Error('Empleado no encontrado o inactivo');
    }

    if (empleado.pin !== pin) {
      throw new Error('PIN incorrecto');
    }

    this.empleadoActual = empleado;
    this.guardarDatos();

    // Notificar login a otros dispositivos
    syncService.notificarLogin(empleado);

    return empleado;
  }

  async logout(): Promise<void> {
    if (this.empleadoActual) {
      syncService.notificarLogout(this.empleadoActual);
    }
    
    this.empleadoActual = null;
    localStorage.removeItem('minimarket-empleado-actual');
  }

  async obtenerEmpleadoActual(): Promise<Empleado | null> {
    return this.empleadoActual;
  }

  async estaAutenticado(): Promise<boolean> {
    return this.empleadoActual !== null;
  }

  async tienePermiso(accion: string): Promise<boolean> {
    if (!this.empleadoActual) return false;

    const permisos = {
      jefe: ['*'], // Todos los permisos
      empleado: [
        'ventas',
        'inventario.ver',
        'caja.ver'
      ]
    };

    const permisosRol = permisos[this.empleadoActual.rol] || [];
    return permisosRol.includes('*') || permisosRol.includes(accion);
  }

  async obtenerEmpleados(): Promise<Empleado[]> {
    // Verificar permisos
    if (!(await this.tienePermiso('empleados.ver'))) {
      throw new Error('Sin permisos para ver empleados');
    }

    return this.empleados;
  }

  async obtenerEmpleadosActivos(): Promise<Empleado[]> {
    return this.empleados.filter(e => e.activo);
  }

  async crearEmpleado(datos: {
    nombre: string;
    email: string;
    rol: 'jefe' | 'empleado';
    pin: string;
  }): Promise<Empleado> {
    // Verificar permisos
    if (!(await this.tienePermiso('empleados.crear'))) {
      throw new Error('Sin permisos para crear empleados');
    }

    // Validaciones
    if (this.empleados.some(e => e.email === datos.email)) {
      throw new Error('Ya existe un empleado con ese email');
    }

    if (this.empleados.some(e => e.pin === datos.pin)) {
      throw new Error('Ya existe un empleado con ese PIN');
    }

    const nuevoEmpleado: Empleado = {
      id: `emp-${Date.now()}`,
      ...datos,
      activo: true
    };

    this.empleados.push(nuevoEmpleado);
    this.guardarDatos();

    // Sincronizar con otros dispositivos
    syncService.notificarNuevoEmpleado(nuevoEmpleado);

    return nuevoEmpleado;
  }

  async actualizarEmpleado(empleado: Empleado): Promise<Empleado> {
    // Verificar permisos
    if (!(await this.tienePermiso('empleados.editar'))) {
      throw new Error('Sin permisos para editar empleados');
    }

    const index = this.empleados.findIndex(e => e.id === empleado.id);
    if (index === -1) {
      throw new Error('Empleado no encontrado');
    }

    // Validar email único (excluyendo el empleado actual)
    if (this.empleados.some(e => e.id !== empleado.id && e.email === empleado.email)) {
      throw new Error('Ya existe un empleado con ese email');
    }

    // Validar PIN único (excluyendo el empleado actual)
    if (this.empleados.some(e => e.id !== empleado.id && e.pin === empleado.pin)) {
      throw new Error('Ya existe un empleado con ese PIN');
    }

    this.empleados[index] = empleado;
    this.guardarDatos();

    // Sincronizar con otros dispositivos
    syncService.notificarEmpleadoActualizado(empleado);

    return empleado;
  }

  async toggleEstadoEmpleado(empleadoId: string): Promise<Empleado> {
    // Verificar permisos
    if (!(await this.tienePermiso('empleados.editar'))) {
      throw new Error('Sin permisos para cambiar estado de empleados');
    }

    const empleado = this.empleados.find(e => e.id === empleadoId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // No permitir desactivar el último jefe
    if (empleado.rol === 'jefe' && empleado.activo) {
      const jefesActivos = this.empleados.filter(e => e.rol === 'jefe' && e.activo);
      if (jefesActivos.length === 1) {
        throw new Error('No se puede desactivar el último jefe');
      }
    }

    empleado.activo = !empleado.activo;
    this.guardarDatos();

    // Sincronizar con otros dispositivos
    syncService.notificarEmpleadoActualizado(empleado);

    return empleado;
  }

  async eliminarEmpleado(empleadoId: string): Promise<void> {
    // Verificar permisos
    if (!(await this.tienePermiso('empleados.eliminar'))) {
      throw new Error('Sin permisos para eliminar empleados');
    }

    const empleado = this.empleados.find(e => e.id === empleadoId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // No permitir eliminar el último jefe
    if (empleado.rol === 'jefe') {
      const jefes = this.empleados.filter(e => e.rol === 'jefe');
      if (jefes.length === 1) {
        throw new Error('No se puede eliminar el último jefe');
      }
    }

    // No permitir eliminar el empleado actual
    if (empleado.id === this.empleadoActual?.id) {
      throw new Error('No puedes eliminar tu propio usuario');
    }

    this.empleados = this.empleados.filter(e => e.id !== empleadoId);
    this.guardarDatos();

    // Sincronizar con otros dispositivos
    syncService.notificarEmpleadoEliminado(empleadoId);
  }

  async cambiarPin(nuevoPin: string): Promise<void> {
    if (!this.empleadoActual) {
      throw new Error('No hay empleado autenticado');
    }

    if (nuevoPin.length < 4) {
      throw new Error('El PIN debe tener al menos 4 dígitos');
    }

    // Verificar que el PIN no esté en uso
    if (this.empleados.some(e => e.id !== this.empleadoActual!.id && e.pin === nuevoPin)) {
      throw new Error('Ya existe un empleado con ese PIN');
    }

    this.empleadoActual.pin = nuevoPin;
    
    const index = this.empleados.findIndex(e => e.id === this.empleadoActual!.id);
    if (index !== -1) {
      this.empleados[index] = this.empleadoActual;
    }

    this.guardarDatos();

    // Sincronizar con otros dispositivos
    syncService.notificarEmpleadoActualizado(this.empleadoActual);
  }

  async obtenerEstadisticasEmpleados(): Promise<any> {
    const totalEmpleados = this.empleados.length;
    const empleadosActivos = this.empleados.filter(e => e.activo).length;
    const porRol = {
      jefe: this.empleados.filter(e => e.rol === 'jefe').length,
      empleado: this.empleados.filter(e => e.rol === 'empleado').length
    };

    return {
      totalEmpleados,
      empleadosActivos,
      empleadosInactivos: totalEmpleados - empleadosActivos,
      porRol,
      empleadoActual: this.empleadoActual
    };
  }
}

export const authService = new AuthService();