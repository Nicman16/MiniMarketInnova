// src/services/statisticsService.ts
import { Producto, Deuda } from '../types/pos.types';

export const statisticsService = {
  // Obtener estadísticas avanzadas
  async obtenerEstadisticasAvanzadas(periodo: '7d' | '30d' | '90d' = '30d') {
    try {
      const response = await fetch(`/api/stats/advanced?periodo=${periodo}`);
      if (!response.ok) throw new Error('Error al obtener estadísticas avanzadas');
      return await response.json();
    } catch (error) {
      console.error('Error en obtenerEstadisticasAvanzadas:', error);
      return null;
    }
  },

  // Obtener ventas por período
  async obtenerVentasPorPeriodo(fechaInicio: string, fechaFin: string) {
    try {
      const response = await fetch(`/api/stats/ventas?inicio=${fechaInicio}&fin=${fechaFin}`);
      if (!response.ok) throw new Error('Error al obtener ventas');
      return await response.json();
    } catch (error) {
      console.error('Error en obtenerVentasPorPeriodo:', error);
      return [];
    }
  },

  // Obtener productos más vendidos
  async obtenerProductosMasVendidos(limite: number = 10) {
    try {
      const response = await fetch(`/api/stats/productos-vendidos?limite=${limite}`);
      if (!response.ok) throw new Error('Error al obtener productos vendidos');
      return await response.json();
    } catch (error) {
      console.error('Error en obtenerProductosMasVendidos:', error);
      return [];
    }
  },

  // Obtener información de deudas
  async obtenerEstadisticasDeudas() {
    try {
      const response = await fetch('/api/stats/deudas');
      if (!response.ok) throw new Error('Error al obtener deudas');
      return await response.json();
    } catch (error) {
      console.error('Error en obtenerEstadisticasDeudas:', error);
      return null;
    }
  },

  // Obtener margen de ganancia
  async obtenerMargenes() {
    try {
      const response = await fetch('/api/stats/margenes');
      if (!response.ok) throw new Error('Error al obtener márgenes');
      return await response.json();
    } catch (error) {
      console.error('Error en obtenerMargenes:', error);
      return null;
    }
  },

  // Obtener resumen ejecutivo
  async obtenerResumenEjecutivo() {
    try {
      const response = await fetch('/api/stats/resumen');
      if (!response.ok) throw new Error('Error al obtener resumen');
      return await response.json();
    } catch (error) {
      console.error('Error en obtenerResumenEjecutivo:', error);
      return null;
    }
  }
};
