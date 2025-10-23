// src/services/ventasService.ts
import { syncService } from './syncService';
import { Venta, SesionCaja, ItemVenta } from '../types/pos.types';

class VentasService {
  private ventas: Venta[] = [];
  private sesionActiva: SesionCaja | null = null;

  constructor() {
    this.cargarDatos();
  }

  private cargarDatos() {
    // Cargar desde localStorage o API
    const ventasGuardadas = localStorage.getItem('minimarket-ventas');
    if (ventasGuardadas) {
      this.ventas = JSON.parse(ventasGuardadas);
    }

    const sesionGuardada = localStorage.getItem('minimarket-sesion-activa');
    if (sesionGuardada) {
      this.sesionActiva = JSON.parse(sesionGuardada);
    }
  }

  private guardarDatos() {
    localStorage.setItem('minimarket-ventas', JSON.stringify(this.ventas));
    if (this.sesionActiva) {
      localStorage.setItem('minimarket-sesion-activa', JSON.stringify(this.sesionActiva));
    } else {
      localStorage.removeItem('minimarket-sesion-activa');
    }
  }

  async obtenerSesionActiva(): Promise<SesionCaja | null> {
    return this.sesionActiva;
  }

  async procesarVenta(ventaData: Partial<Venta>): Promise<Venta> {
    const venta: Venta = {
      id: `venta-${Date.now()}`,
      fecha: new Date().toISOString(),
      estado: 'completada',
      ...ventaData
    } as Venta;

    this.ventas.push(venta);
    
    // Sincronizar con otros dispositivos
    syncService.registrarVenta(venta);
    
    this.guardarDatos();
    return venta;
  }

  async obtenerVentasDia(fecha?: string): Promise<Venta[]> {
    const fechaBuscar = fecha || new Date().toISOString().split('T')[0];
    return this.ventas.filter(venta => 
      venta.fecha.startsWith(fechaBuscar)
    );
  }

  async obtenerReporteVentas(fechaInicio: string, fechaFin: string): Promise<any> {
    const ventasPeriodo = this.ventas.filter(venta => {
      const fechaVenta = venta.fecha.split('T')[0];
      return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });

    const totalVendido = ventasPeriodo.reduce((total, venta) => total + venta.total, 0);
    const cantidadVentas = ventasPeriodo.length;
    
    const ventasPorMetodo = ventasPeriodo.reduce((acc, venta) => {
      acc[venta.metodoPago] = (acc[venta.metodoPago] || 0) + venta.total;
      return acc;
    }, {} as Record<string, number>);

    // Ventas por día para gráfico
    const ventasPorDia = this.agruparVentasPorDia(ventasPeriodo, fechaInicio, fechaFin);

    return {
      totalVendido,
      cantidadVentas,
      efectivo: ventasPorMetodo.efectivo || 0,
      tarjeta: ventasPorMetodo.tarjeta || 0,
      transferencia: ventasPorMetodo.transferencia || 0,
      ventasPorDia,
      maxDia: Math.max(...ventasPorDia.map(d => d.total)),
      cambioAnterior: this.calcularCambioAnterior(fechaInicio, fechaFin, totalVendido)
    };
  }

  async obtenerReporteProductos(fechaInicio: string, fechaFin: string): Promise<any[]> {
    const ventasPeriodo = this.ventas.filter(venta => {
      const fechaVenta = venta.fecha.split('T')[0];
      return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });

    const productosVendidos = new Map();
    
    ventasPeriodo.forEach(venta => {
      venta.items.forEach(item => {
        const key = item.producto.id;
        if (productosVendidos.has(key)) {
          const existing = productosVendidos.get(key);
          existing.cantidadVendida += item.cantidad;
          existing.ingresos += item.subtotal;
        } else {
          productosVendidos.set(key, {
            id: item.producto.id,
            nombre: item.producto.nombre,
            cantidadVendida: item.cantidad,
            ingresos: item.subtotal
          });
        }
      });
    });

    const productos = Array.from(productosVendidos.values());
    const totalIngresos = productos.reduce((total, p) => total + p.ingresos, 0);
    
    return productos
      .map(p => ({
        ...p,
        porcentaje: Math.round((p.ingresos / totalIngresos) * 100)
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);
  }

  async obtenerReporteEmpleados(fechaInicio: string, fechaFin: string): Promise<any[]> {
    const ventasPeriodo = this.ventas.filter(venta => {
      const fechaVenta = venta.fecha.split('T')[0];
      return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });

    const empleadosVentas = new Map();
    
    ventasPeriodo.forEach(venta => {
      const empleadoId = venta.vendedor.id;
      if (empleadosVentas.has(empleadoId)) {
        const existing = empleadosVentas.get(empleadoId);
        existing.totalVentas += venta.total;
        existing.cantidadVentas += 1;
      } else {
        empleadosVentas.set(empleadoId, {
          id: empleadoId,
          nombre: venta.vendedor.nombre,
          totalVentas: venta.total,
          cantidadVentas: 1,
          horasTrabajadas: 8 // Mockup - en producción calcular real
        });
      }
    });

    const empleados = Array.from(empleadosVentas.values());
    const maxVentas = Math.max(...empleados.map(e => e.totalVentas));
    
    return empleados.map(empleado => ({
      ...empleado,
      rendimiento: Math.round((empleado.totalVentas / maxVentas) * 100)
    })).sort((a, b) => b.totalVentas - a.totalVentas);
  }

  async obtenerStockBajo(): Promise<any[]> {
    const productos = syncService.obtenerProductos();
    return productos
      .filter(producto => producto.cantidad <= 5)
      .sort((a, b) => a.cantidad - b.cantidad);
  }

  private agruparVentasPorDia(ventas: Venta[], fechaInicio: string, fechaFin: string): any[] {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const dias = [];

    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const fecha = d.toISOString().split('T')[0];
      const ventasDia = ventas.filter(v => v.fecha.startsWith(fecha));
      const total = ventasDia.reduce((sum, v) => sum + v.total, 0);
      
      dias.push({
        fecha,
        total,
        cantidad: ventasDia.length
      });
    }

    return dias;
  }

  private calcularCambioAnterior(fechaInicio: string, fechaFin: string, totalActual: number): number {
    // Calcular período anterior del mismo tamaño
    const dias = Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24));
    const fechaInicioAnterior = new Date(fechaInicio);
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - dias);
    const fechaFinAnterior = new Date(fechaInicio);
    fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1);

    const ventasAnteriores = this.ventas.filter(venta => {
      const fechaVenta = venta.fecha.split('T')[0];
      return fechaVenta >= fechaInicioAnterior.toISOString().split('T')[0] && 
             fechaVenta <= fechaFinAnterior.toISOString().split('T')[0];
    });

    const totalAnterior = ventasAnteriores.reduce((total, venta) => total + venta.total, 0);
    
    if (totalAnterior === 0) return 0;
    return Math.round(((totalActual - totalAnterior) / totalAnterior) * 100);
  }
}

export const ventasService = new VentasService();