import { apiClient } from '../shared/apiConfig';

class VentasService {
  async obtenerReporteVentas(fechaInicio: string, fechaFin: string): Promise<any> {
    const response = await apiClient.get<any[]>('/api/reportes/ventas', {
      params: { inicio: fechaInicio, fin: fechaFin }
    });
    const ventasPorDia = response.data;

    const totalVendido = ventasPorDia.reduce((sum, dia) => sum + dia.ingresos, 0);
    const cantidadVentas = ventasPorDia.reduce((sum, dia) => sum + dia.cantidad, 0);
    const maxDia = Math.max(...ventasPorDia.map((dia) => dia.ingresos), 0);
    const efectivo = ventasPorDia.reduce((sum, dia) => sum + (dia.efectivo || 0), 0);
    const tarjeta = ventasPorDia.reduce((sum, dia) => sum + (dia.tarjeta || 0), 0);
    const transferencia = ventasPorDia.reduce((sum, dia) => sum + (dia.transferencia || 0), 0);

    return {
      totalVendido,
      cantidadVentas,
      efectivo,
      tarjeta,
      transferencia,
      ventasPorDia: ventasPorDia.map((dia) => ({
        fecha: dia.fecha,
        total: dia.ingresos,
        cantidad: dia.cantidad
      })),
      maxDia,
      cambioAnterior: 0
    };
  }

  async obtenerReporteProductos(fechaInicio: string, fechaFin: string): Promise<any[]> {
    const response = await apiClient.get<any[]>('/api/reportes/productos', {
      params: { inicio: fechaInicio, fin: fechaFin }
    });
    const productos = response.data;
    const totalIngresos = productos.reduce((sum, producto) => sum + producto.ingresos, 0);

    return productos.map((producto, index) => ({
      id: producto.id || `${producto.nombre}-${index}`,
      nombre: producto.nombre,
      cantidadVendida: producto.cantidad,
      ingresos: producto.ingresos,
      porcentaje: totalIngresos > 0 ? Math.round((producto.ingresos / totalIngresos) * 100) : 0
    }));
  }

  async obtenerReporteEmpleados(fechaInicio: string, fechaFin: string): Promise<any[]> {
    const response = await apiClient.get<any[]>('/api/reportes/empleados', {
      params: { inicio: fechaInicio, fin: fechaFin }
    });
    const empleados = response.data;
    const maxVentas = Math.max(...empleados.map((empleado) => empleado.ingresos), 0);

    return empleados.map((empleado, index) => ({
      id: empleado.id || `${empleado.nombre}-${index}`,
      nombre: empleado.nombre,
      totalVentas: empleado.ingresos,
      cantidadVentas: empleado.ventas,
      horasTrabajadas: 8,
      rendimiento: maxVentas > 0 ? Math.round((empleado.ingresos / maxVentas) * 100) : 0
    }));
  }

  async obtenerStockBajo(): Promise<any[]> {
    const response = await apiClient.get<any[]>('/api/reportes/stock-bajo');
    const productos = response.data;

    return productos.map((producto, index) => ({
      id: producto.id || `${producto.nombre}-${index}`,
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras || 'N/D',
      cantidad: producto.cantidad,
      nivelMinimo: producto.nivel_minimo,
      diasSinStock: producto.dias_sin_stock
    }));
  }
}

export const ventasService = new VentasService();