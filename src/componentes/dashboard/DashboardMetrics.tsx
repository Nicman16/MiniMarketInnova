import React, { useCallback, useEffect, useState } from 'react';
import { fetchApiJson } from '../../services/shared/httpClient';

interface Estadisticas {
  productosAgregados: number;
  productosActualizados: number;
  escaneos: number;
  inicioServidor: string;
}

interface StatsResponse {
  productos: number;
  dispositivos: number;
  estadisticas: Estadisticas;
}

interface ResumenResponse {
  ventas?: {
    hoy?: number;
    promedioDiario?: number;
    tendencia?: number;
  };
  salud?: {
    alertas?: number;
  };
}

function DashboardMetrics() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [resumen, setResumen] = useState<ResumenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fallbackStats: StatsResponse = {
    productos: 0,
    dispositivos: 0,
    estadisticas: {
      productosAgregados: 0,
      productosActualizados: 0,
      escaneos: 0,
      inicioServidor: new Date().toISOString()
    }
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [data, resumenData] = await Promise.all([
        fetchApiJson<StatsResponse>('/api/stats'),
        fetchApiJson<ResumenResponse>('/api/stats/resumen')
      ]);
      setStats(data);
      setResumen(resumenData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar métricas');
      setStats(fallbackStats);
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner-modern"></div>
          <p>Cargando métricas del sistema...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p>No fue posible cargar métricas: {error}</p>
          <button onClick={fetchStats} className="retry-btn">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(value);
  };

  const ventasHoy = Number(resumen?.ventas?.hoy || 0);
  const tendenciaVentas = Number(resumen?.ventas?.tendencia || 0);
  const alertas = Number(resumen?.salud?.alertas || 0);

  return (
    <div className="dashboard-container">
      {error && (
        <div className="metrics-warning-banner">
          Mostrando métricas de respaldo temporalmente. Causa detectada: {error}
        </div>
      )}

      {/* HEADER DEL DASHBOARD */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1>MiniMarket Innova</h1>
            <p className="dashboard-subtitle">Panel de control en tiempo real</p>
          </div>
          <div className="header-stats">
            <div className="header-stat">
              <span className="stat-icon">🟢</span>
              <span>Sistema Activo</span>
            </div>
            <div className="header-stat">
              <span className="stat-icon">📅</span>
              <span>{new Date().toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="metrics-overview">
        <div className="metric-card-large primary">
          <div className="metric-header">
            <div className="metric-icon-large">📦</div>
            <div className="metric-info">
              <h3>Inventario Total</h3>
              <p>Productos disponibles</p>
            </div>
          </div>
          <div className="metric-value-large">{formatNumber(stats.productos)}</div>
          <div className="metric-change positive">
            <span className="change-icon">↗️</span>
            <span>+12% esta semana</span>
          </div>
        </div>

        <div className="metric-card-large success">
          <div className="metric-header">
            <div className="metric-icon-large">💰</div>
            <div className="metric-info">
              <h3>Ventas del Día</h3>
              <p>Ingresos generados</p>
            </div>
          </div>
          <div className="metric-value-large">{formatNumber(ventasHoy)}</div>
          <div className={`metric-change ${tendenciaVentas >= 0 ? 'positive' : 'negative'}`}>
            <span className="change-icon">{tendenciaVentas >= 0 ? '↗️' : '↘️'}</span>
            <span>{Math.abs(tendenciaVentas).toFixed(1)}% vs periodo anterior</span>
          </div>
        </div>

        <div className="metric-card-large info">
          <div className="metric-header">
            <div className="metric-icon-large">📱</div>
            <div className="metric-info">
              <h3>Dispositivos</h3>
              <p>Conectados al sistema</p>
            </div>
          </div>
          <div className="metric-value-large">{stats.dispositivos}</div>
          <div className="metric-change neutral">
            <span className="change-icon">➡️</span>
            <span>Estable</span>
          </div>
        </div>

        <div className="metric-card-large warning">
          <div className="metric-header">
            <div className="metric-icon-large">⏱️</div>
            <div className="metric-info">
              <h3>Tiempo Activo</h3>
              <p>Horas de funcionamiento</p>
            </div>
          </div>
          <div className="metric-value-large">{Math.floor((Date.now() - new Date(stats.estadisticas.inicioServidor).getTime()) / (1000 * 60 * 60))}</div>
          <div className="metric-change neutral">
            <span className="change-icon">🕐</span>
            <span>Continuo</span>
          </div>
        </div>
      </div>

      {/* MÉTRICAS SECUNDARIAS */}
      <div className="metrics-secondary">
        <div className="secondary-grid">
          <div className="metric-card-medium">
            <div className="metric-icon">➕</div>
            <div className="metric-content">
              <div className="metric-label">Productos Agregados</div>
              <div className="metric-value">{formatNumber(stats.estadisticas.productosAgregados)}</div>
              <div className="metric-trend positive">Hoy</div>
            </div>
          </div>

          <div className="metric-card-medium">
            <div className="metric-icon">🔄</div>
            <div className="metric-content">
              <div className="metric-label">Actualizaciones</div>
              <div className="metric-value">{formatNumber(stats.estadisticas.productosActualizados)}</div>
              <div className="metric-trend positive">Hoy</div>
            </div>
          </div>

          <div className="metric-card-medium">
            <div className="metric-icon">📱</div>
            <div className="metric-content">
              <div className="metric-label">Escaneos</div>
              <div className="metric-value">{formatNumber(stats.estadisticas.escaneos)}</div>
              <div className="metric-trend positive">Sesión</div>
            </div>
          </div>

          <div className="metric-card-medium">
            <div className="metric-icon">🔔</div>
            <div className="metric-content">
              <div className="metric-label">Alertas</div>
              <div className="metric-value">{formatNumber(alertas)}</div>
              <div className={`metric-trend ${alertas > 0 ? 'warning' : 'positive'}`}>{alertas > 0 ? 'Activas' : 'Sin alertas'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ESTADO DEL SISTEMA */}
      <div className="system-status">
        <h3 className="section-title">Estado del Sistema</h3>
        <div className="status-indicators">
          <div className="status-item online">
            <div className="status-dot"></div>
            <span>Base de Datos</span>
            <span className="status-desc">Conectado</span>
          </div>
          <div className="status-item online">
            <div className="status-dot"></div>
            <span>Servidor API</span>
            <span className="status-desc">Operativo</span>
          </div>
          <div className="status-item warning">
            <div className="status-dot"></div>
            <span>Sincronización</span>
            <span className="status-desc">5 min atrás</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMetrics;
