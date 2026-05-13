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
  fecha?: string;
  ventas?: {
    hoy?: number;
    promedioDiario?: number;
    tendencia?: number;
  };
  salud?: {
    alertas?: number;
    stockBajo?: number;
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

  const formatUptime = (inicioServidor: string) => {
    const inicio = new Date(inicioServidor).getTime();
    if (Number.isNaN(inicio)) {
      return '0h';
    }

    const diff = Math.max(0, Date.now() - inicio);
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) {
      return `${minutes} min`;
    }

    return `${hours}h ${minutes}m`;
  };

  const buildMetricState = (value: number, options: {
    positiveLabel: string;
    emptyLabel: string;
    warningLabel?: string;
    warningWhen?: boolean;
  }) => {
    if (options.warningWhen) {
      return {
        tone: 'warning',
        icon: '⚠️',
        label: options.warningLabel || options.positiveLabel
      };
    }

    if (value > 0) {
      return {
        tone: 'positive',
        icon: '↗️',
        label: options.positiveLabel
      };
    }

    return {
      tone: 'inactive',
      icon: '•',
      label: options.emptyLabel
    };
  };

  const buildStatusState = (mode: 'online' | 'warning' | 'inactive', label: string) => ({
    mode,
    label
  });

  const ventasHoy = Number(resumen?.ventas?.hoy || 0);
  const tendenciaVentas = Number(resumen?.ventas?.tendencia || 0);
  const alertas = Number(resumen?.salud?.alertas || 0);
  const stockBajo = Number(resumen?.salud?.stockBajo || 0);
  const uptime = formatUptime(stats.estadisticas.inicioServidor);

  const inventarioState = buildMetricState(stats.estadisticas.productosAgregados, {
    positiveLabel: `${formatNumber(stats.estadisticas.productosAgregados)} altas en esta sesión`,
    emptyLabel: 'Sin altas registradas en esta sesión'
  });

  const ventasState = ventasHoy > 0
    ? {
        tone: tendenciaVentas < 0 ? 'warning' : 'positive',
        icon: tendenciaVentas < 0 ? '↘️' : '↗️',
        label: tendenciaVentas === 0
          ? `${formatNumber(ventasHoy)} ventas registradas hoy`
          : `${Math.abs(tendenciaVentas).toFixed(1)}% vs promedio reciente`
      }
    : {
        tone: 'inactive',
        icon: '•',
        label: 'Sin ventas registradas hoy'
      };

  const dispositivosState = buildMetricState(stats.dispositivos, {
    positiveLabel: `${formatNumber(stats.dispositivos)} conectados ahora`,
    emptyLabel: 'Sin dispositivos reportados'
  });

  const uptimeState = {
    tone: 'neutral',
    icon: '🕐',
    label: 'Tiempo continuo desde el último reinicio'
  };

  const productosAgregadosState = buildMetricState(stats.estadisticas.productosAgregados, {
    positiveLabel: 'Hubo altas en la sesión',
    emptyLabel: 'Sin productos agregados aún'
  });

  const actualizacionesState = buildMetricState(stats.estadisticas.productosActualizados, {
    positiveLabel: 'Cambios aplicados en la sesión',
    emptyLabel: 'Sin actualizaciones registradas'
  });

  const escaneosState = buildMetricState(stats.estadisticas.escaneos, {
    positiveLabel: 'Lecturas registradas en la sesión',
    emptyLabel: 'Sin escaneos todavía'
  });

  const alertasState = buildMetricState(alertas, {
    positiveLabel: `${formatNumber(alertas)} alerta${alertas === 1 ? '' : 's'} activa${alertas === 1 ? '' : 's'}`,
    emptyLabel: 'Sin alertas activas',
    warningLabel: `${formatNumber(stockBajo)} producto${stockBajo === 1 ? '' : 's'} con stock bajo`,
    warningWhen: stockBajo > 0
  });

  const dbStatus = buildStatusState(error ? 'warning' : 'online', error ? 'Con fallback temporal' : 'Con datos sincronizados');
  const apiStatus = buildStatusState(error ? 'warning' : 'online', error ? 'Respuesta degradada' : 'Operativo');
  const syncStatus = buildStatusState(
    resumen?.fecha ? 'online' : 'inactive',
    resumen?.fecha ? 'Actualizado hace instantes' : 'Sin marca de sincronización'
  );

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
          <div className={`metric-change ${inventarioState.tone}`}>
            <span className="change-icon">{inventarioState.icon}</span>
            <span>{inventarioState.label}</span>
          </div>
        </div>

        <div className="metric-card-large success">
          <div className="metric-header">
            <div className="metric-icon-large">💰</div>
            <div className="metric-info">
              <h3>Ventas del Día</h3>
              <p>Transacciones registradas hoy</p>
            </div>
          </div>
          <div className="metric-value-large">{formatNumber(ventasHoy)}</div>
          <div className={`metric-change ${ventasState.tone}`}>
            <span className="change-icon">{ventasState.icon}</span>
            <span>{ventasState.label}</span>
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
          <div className={`metric-change ${dispositivosState.tone}`}>
            <span className="change-icon">{dispositivosState.icon}</span>
            <span>{dispositivosState.label}</span>
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
          <div className="metric-value-large">{uptime}</div>
          <div className={`metric-change ${uptimeState.tone}`}>
            <span className="change-icon">{uptimeState.icon}</span>
            <span>{uptimeState.label}</span>
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
              <div className={`metric-trend ${productosAgregadosState.tone}`}>{productosAgregadosState.label}</div>
            </div>
          </div>

          <div className="metric-card-medium">
            <div className="metric-icon">🔄</div>
            <div className="metric-content">
              <div className="metric-label">Actualizaciones</div>
              <div className="metric-value">{formatNumber(stats.estadisticas.productosActualizados)}</div>
              <div className={`metric-trend ${actualizacionesState.tone}`}>{actualizacionesState.label}</div>
            </div>
          </div>

          <div className="metric-card-medium">
            <div className="metric-icon">📱</div>
            <div className="metric-content">
              <div className="metric-label">Escaneos</div>
              <div className="metric-value">{formatNumber(stats.estadisticas.escaneos)}</div>
              <div className={`metric-trend ${escaneosState.tone}`}>{escaneosState.label}</div>
            </div>
          </div>

          <div className="metric-card-medium">
            <div className="metric-icon">🔔</div>
            <div className="metric-content">
              <div className="metric-label">Alertas</div>
              <div className="metric-value">{formatNumber(alertas)}</div>
              <div className={`metric-trend ${alertasState.tone}`}>{alertasState.label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ESTADO DEL SISTEMA */}
      <div className="system-status">
        <h3 className="section-title">Estado del Sistema</h3>
        <div className="status-indicators">
          <div className={`status-item ${dbStatus.mode}`}>
            <div className="status-dot"></div>
            <span>Base de Datos</span>
            <span className="status-desc">{dbStatus.label}</span>
          </div>
          <div className={`status-item ${apiStatus.mode}`}>
            <div className="status-dot"></div>
            <span>Servidor API</span>
            <span className="status-desc">{apiStatus.label}</span>
          </div>
          <div className={`status-item ${syncStatus.mode}`}>
            <div className="status-dot"></div>
            <span>Sincronización</span>
            <span className="status-desc">{syncStatus.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMetrics;
