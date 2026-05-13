// src/services/dashboard/statisticsService.ts
import { fetchApiJson } from '../shared/httpClient';

export const statisticsService = {
  // Obtener estadísticas avanzadas
  async obtenerEstadisticasAvanzadas(periodo: '7d' | '30d' | '90d' = '30d'): Promise<any> {
    try {
      return await fetchApiJson(`/api/stats/advanced?periodo=${periodo}`);
    } catch (error) {
      console.error('Error en obtenerEstadisticasAvanzadas:', error);
      return null;
    }
  },

  // Obtener ventas por periodo
  async obtenerVentasPorPeriodo(fechaInicio: string, fechaFin: string): Promise<any[]> {
    try {
      return await fetchApiJson(`/api/reportes/ventas?inicio=${fechaInicio}&fin=${fechaFin}`);
    } catch (error) {
      console.error('Error en obtenerVentasPorPeriodo:', error);
      return [];
    }
  },

  // Obtener productos más vendidos
  async obtenerProductosMasVendidos(limite: number = 10): Promise<any[]> {
    try {
      return await fetchApiJson(`/api/stats/productos-vendidos?limite=${limite}`);
    } catch (error) {
      console.error('Error en obtenerProductosMasVendidos:', error);
      return [];
    }
  },

  // Obtener información de deudas
  async obtenerEstadisticasDeudas(): Promise<any> {
    try {
      return await fetchApiJson('/api/stats/deudas');
    } catch (error) {
      console.error('Error en obtenerEstadisticasDeudas:', error);
      return null;
    }
  },

  // Obtener margen de ganancia
  async obtenerMargenes(): Promise<any> {
    try {
      return await fetchApiJson('/api/stats/margenes');
    } catch (error) {
      console.error('Error en obtenerMargenes:', error);
      return null;
    }
  },

  // Obtener resumen ejecutivo
  async obtenerResumenEjecutivo(): Promise<any> {
    try {
      return await fetchApiJson('/api/stats/resumen');
    } catch (error) {
      console.error('Error en obtenerResumenEjecutivo:', error);
      return null;
    }
  }
};
