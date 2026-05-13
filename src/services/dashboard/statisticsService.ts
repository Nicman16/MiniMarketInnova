// src/services/dashboard/statisticsService.ts
import { getApiBase } from '../shared/apiConfig';

const API_BASE = getApiBase();

const fetchJson = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  if (!contentType.includes('application/json')) {
    throw new Error(`Respuesta no JSON en ${url}`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`JSON inválido en ${url}`);
  }
};

export const statisticsService = {
  // Obtener estadísticas avanzadas
  async obtenerEstadisticasAvanzadas(periodo: '7d' | '30d' | '90d' = '30d') {
    try {
      return await fetchJson(`${API_BASE}/api/stats/advanced?periodo=${periodo}`);
    } catch (error) {
      console.error('Error en obtenerEstadisticasAvanzadas:', error);
      return null;
    }
  },

  // Obtener ventas por periodo
  async obtenerVentasPorPeriodo(fechaInicio: string, fechaFin: string) {
    try {
      return await fetchJson(`${API_BASE}/api/reportes/ventas?inicio=${fechaInicio}&fin=${fechaFin}`);
    } catch (error) {
      console.error('Error en obtenerVentasPorPeriodo:', error);
      return [];
    }
  },

  // Obtener productos más vendidos
  async obtenerProductosMasVendidos(limite: number = 10) {
    try {
      return await fetchJson(`${API_BASE}/api/stats/productos-vendidos?limite=${limite}`);
    } catch (error) {
      console.error('Error en obtenerProductosMasVendidos:', error);
      return [];
    }
  },

  // Obtener información de deudas
  async obtenerEstadisticasDeudas() {
    try {
      return await fetchJson(`${API_BASE}/api/stats/deudas`);
    } catch (error) {
      console.error('Error en obtenerEstadisticasDeudas:', error);
      return null;
    }
  },

  // Obtener margen de ganancia
  async obtenerMargenes() {
    try {
      return await fetchJson(`${API_BASE}/api/stats/margenes`);
    } catch (error) {
      console.error('Error en obtenerMargenes:', error);
      return null;
    }
  },

  // Obtener resumen ejecutivo
  async obtenerResumenEjecutivo() {
    try {
      return await fetchJson(`${API_BASE}/api/stats/resumen`);
    } catch (error) {
      console.error('Error en obtenerResumenEjecutivo:', error);
      return null;
    }
  }
};
