import React, { useEffect, useState } from 'react';

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

function DashboardMetrics() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
          throw new Error('No se pudieron cargar las métricas');
        }
        const data: StatsResponse = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar métricas');
        // Datos de ejemplo para desarrollo
        setStats({
          productos: 1247,
          dispositivos: 8,
          estadisticas: {
            productosAgregados: 45,
            productosActualizados: 23,
            escaneos: 156,
            inicioServidor: new Date().toISOString()
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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

  if (error || !stats) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p>No fue posible cargar métricas: {error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(value);
  };

  return (
    <div className="dashboard-container">
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
          <div className="metric-value-large">$2,847</div>
          <div className="metric-change positive">
            <span className="change-icon">↗️</span>
            <span>+18% vs ayer</span>
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
              <div className="metric-value">2</div>
              <div className="metric-trend warning">Activas</div>
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
