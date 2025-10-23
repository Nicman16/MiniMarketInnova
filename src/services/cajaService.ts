// src/services/cajaService.ts
import { SesionCaja, MovimientoCaja, Empleado } from '../types/pos.types';
import { syncService } from './syncService';

class CajaService {
  private sesiones: SesionCaja[] = [];
  private movimientos: MovimientoCaja[] = [];
  private empleados: Empleado[] = [];

  constructor() {
    this.cargarDatos();
    this.inicializarEmpleadosDemo();
  }

  private cargarDatos() {
    const sesionesGuardadas = localStorage.getItem('minimarket-sesiones');
    if (sesionesGuardadas) {
      this.sesiones = JSON.parse(sesionesGuardadas);
    }

    const movimientosGuardados = localStorage.getItem('minimarket-movimientos');
    if (movimientosGuardados) {
      this.movimientos = JSON.parse(movimientosGuardados);
    }

    const empleadosGuardados = localStorage.getItem('minimarket-empleados');
    if (empleadosGuardados) {
      this.empleados = JSON.parse(empleadosGuardados);
    }
  }

  private guardarDatos() {
    localStorage.setItem('minimarket-sesiones', JSON.stringify(this.sesiones));
    localStorage.setItem('minimarket-movimientos', JSON.stringify(this.movimientos));
    localStorage.setItem('minimarket-empleados', JSON.stringify(this.empleados));
  }

  private inicializarEmpleadosDemo() {
    if (this.empleados.length === 0) {
      this.empleados = [
        {
          id: 'admin-001',
          nombre: 'Admin Principal',
          email: 'admin@minimarket.com',
          rol: 'admin',
          activo: true,
          pin: '1234'
        },
        {
          id: 'vendedor-001',
          nombre: 'María González',
          email: 'maria@minimarket.com',
          rol: 'vendedor',
          activo: true,
          pin: '5678'
        },
        {
          id: 'supervisor-001',
          nombre: 'Carlos Rodríguez',
          email: 'carlos@minimarket.com',
          rol: 'supervisor',
          activo: true,
          pin: '9999'
        }
      ];
      this.guardarDatos();
    }
  }

  async obtenerEmpleados(): Promise<Empleado[]> {
    return this.empleados;
  }

  async obtenerSesionActiva(): Promise<SesionCaja | null> {
    const sesionAbierta = this.sesiones.find(sesion => sesion.estado === 'abierta');
    return sesionAbierta || null;
  }

  async abrirCaja(datos: { empleado: Empleado; montoApertura: number }): Promise<SesionCaja> {
    // Verificar que no hay sesión abierta
    const sesionExistente = await this.obtenerSesionActiva();
    if (sesionExistente) {
      throw new Error('Ya hay una sesión de caja abierta');
    }

    const nuevaSesion: SesionCaja = {
      id: `sesion-${Date.now()}`,
      empleado: datos.empleado,
      fechaApertura: new Date().toISOString(),
      montoApertura: datos.montoApertura,
      ventasEfectivo: 0,
      ventasTarjeta: 0,
      ingresos: 0,
      egresos: 0,
      estado: 'abierta'
    };

    this.sesiones.push(nuevaSesion);

    // Registrar movimiento de apertura
    await this.registrarMovimiento({
      tipo: 'ingreso',
      monto: datos.montoApertura,
      concepto: 'Apertura de caja',
      empleado: datos.empleado
    });

    // Sincronizar con otros dispositivos
    syncService.notificarAperturaCaja(nuevaSesion);

    this.guardarDatos();
    return nuevaSesion;
  }

  async cerrarCaja(sesionId: string, montoCierre: number): Promise<SesionCaja> {
    const sesion = this.sesiones.find(s => s.id === sesionId);
    if (!sesion) {
      throw new Error('Sesión no encontrada');
    }

    if (sesion.estado === 'cerrada') {
      throw new Error('La sesión ya está cerrada');
    }

    sesion.fechaCierre = new Date().toISOString();
    sesion.montoCierre = montoCierre;
    sesion.estado = 'cerrada';

    // Registrar movimiento de cierre
    await this.registrarMovimiento({
      tipo: 'egreso',
      monto: 0,
      concepto: `Cierre de caja - Total: $${montoCierre.toLocaleString()}`,
      empleado: sesion.empleado
    });

    // Sincronizar con otros dispositivos
    syncService.notificarCierreCaja(sesion);

    this.guardarDatos();
    return sesion;
  }

  async registrarMovimiento(datos: {
    tipo: 'ingreso' | 'egreso';
    monto: number;
    concepto: string;
    empleado: Empleado;
  }): Promise<MovimientoCaja> {
    const movimiento: MovimientoCaja = {
      id: `mov-${Date.now()}`,
      fecha: new Date().toISOString(),
      ...datos
    };

    this.movimientos.push(movimiento);

    // Actualizar totales de la sesión actual
    const sesionActiva = await this.obtenerSesionActiva();
    if (sesionActiva) {
      if (datos.tipo === 'ingreso') {
        sesionActiva.ingresos += datos.monto;
      } else {
        sesionActiva.egresos += datos.monto;
      }
    }

    // Sincronizar con otros dispositivos
    syncService.notificarMovimientoCaja(movimiento);

    this.guardarDatos();
    return movimiento;
  }

  async registrarVenta(venta: any): Promise<void> {
    const sesionActiva = await this.obtenerSesionActiva();
    if (!sesionActiva) return;

    // Actualizar totales según método de pago
    switch (venta.metodoPago) {
      case 'efectivo':
        sesionActiva.ventasEfectivo += venta.total;
        break;
      case 'tarjeta':
        sesionActiva.ventasTarjeta += venta.total;
        break;
    }

    this.guardarDatos();
  }

  async obtenerMovimientosDia(fecha?: string): Promise<MovimientoCaja[]> {
    const fechaBuscar = fecha || new Date().toISOString().split('T')[0];
    return this.movimientos
      .filter(mov => mov.fecha.startsWith(fechaBuscar))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  async obtenerResumenDia(fecha?: string): Promise<any> {
    const fechaBuscar = fecha || new Date().toISOString().split('T')[0];
    const sesionActiva = await this.obtenerSesionActiva();
    const movimientosDia = await this.obtenerMovimientosDia(fechaBuscar);

    // Calcular totales de ventas (esto vendría del ventasService en producción)
    const ventasData = this.calcularVentasDia(fechaBuscar);

    const ingresos = movimientosDia
      .filter(mov => mov.tipo === 'ingreso' && mov.concepto !== 'Apertura de caja')
      .reduce((total, mov) => total + mov.monto, 0);

    const egresos = movimientosDia
      .filter(mov => mov.tipo === 'egreso')
      .reduce((total, mov) => total + mov.monto, 0);

    const totalEnCaja = (sesionActiva?.montoApertura || 0) + 
                        ventasData.efectivo + 
                        ingresos - 
                        egresos;

    return {
      totalVentas: ventasData.total,
      cantidadVentas: ventasData.cantidad,
      ventasEfectivo: ventasData.efectivo,
      ventasTarjeta: ventasData.tarjeta,
      ventasTransferencia: ventasData.transferencia,
      ingresos,
      egresos,
      totalEnCaja,
      sesionActiva
    };
  }

  async obtenerResumenParaCierre(): Promise<any> {
    const resumen = await this.obtenerResumenDia();
    const sesionActiva = await this.obtenerSesionActiva();

    return {
      ...resumen,
      totalEsperado: (sesionActiva?.montoApertura || 0) + 
                     resumen.ventasEfectivo + 
                     resumen.ingresos - 
                     resumen.egresos
    };
  }

  private calcularVentasDia(fecha: string): any {
    // En producción, esto consultaría el ventasService
    // Por ahora, datos de ejemplo
    return {
      total: 250000,
      cantidad: 15,
      efectivo: 150000,
      tarjeta: 80000,
      transferencia: 20000
    };
  }

  async obtenerHistorialSesiones(limite?: number): Promise<SesionCaja[]> {
    return this.sesiones
      .sort((a, b) => new Date(b.fechaApertura).getTime() - new Date(a.fechaApertura).getTime())
      .slice(0, limite || 10);
  }

  async obtenerEstadisticasCaja(fechaInicio: string, fechaFin: string): Promise<any> {
    const sesionesPeriodo = this.sesiones.filter(sesion => {
      const fechaSesion = sesion.fechaApertura.split('T')[0];
      return fechaSesion >= fechaInicio && fechaSesion <= fechaFin;
    });

    const totalSesiones = sesionesPeriodo.length;
    const sesionesAbiertas = sesionesPeriodo.filter(s => s.estado === 'abierta').length;
    const promedioDiario = totalSesiones / this.calcularDiasEnRango(fechaInicio, fechaFin);

    return {
      totalSesiones,
      sesionesAbiertas,
      promedioDiario: Math.round(promedioDiario * 100) / 100,
      empleadoMasActivo: this.obtenerEmpleadoMasActivo(sesionesPeriodo)
    };
  }

  private calcularDiasEnRango(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  private obtenerEmpleadoMasActivo(sesiones: SesionCaja[]): string {
    const contadorEmpleados = new Map();
    
    sesiones.forEach(sesion => {
      const nombre = sesion.empleado.nombre;
      contadorEmpleados.set(nombre, (contadorEmpleados.get(nombre) || 0) + 1);
    });

    let empleadoMasActivo = '';
    let maxSesiones = 0;

    contadorEmpleados.forEach((count, nombre) => {
      if (count > maxSesiones) {
        maxSesiones = count;
        empleadoMasActivo = nombre;
      }
    });

    return empleadoMasActivo;
  }
}

export const cajaService = new CajaService();