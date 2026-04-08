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
      <div className="dashboard-summary loading">
        <div className="loading-container">
          <div className="loading-spinner-modern"></div>
          <p>Cargando métricas del sistema...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="dashboard-summary error">
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
    <div className="dashboard-summary">
      <div className="summary-header">
        <div>
          <h2>📊 Panel de Control - MiniMarket Innova</h2>
          <p>Monitoreo en tiempo real del rendimiento del sistema</p>
        </div>
        <div className="summary-badge">
          <span className="status-dot"></span>
          Sistema Activo
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card metric-primary">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <div className="metric-label">Productos en Inventario</div>
            <div className="metric-value">{formatNumber(stats.productos)}</div>
            <div className="metric-trend trend-up">
              <span className="trend-icon">↗️</span>
              +12% esta semana
            </div>
          </div>
        </div>

        <div className="metric-card metric-info">
          <div className="metric-icon">🖥️</div>
          <div className="metric-content">
            <div className="metric-label">Dispositivos Conectados</div>
            <div className="metric-value">{stats.dispositivos}</div>
            <div className="metric-trend trend-neutral">
              <span className="trend-icon">➡️</span>
              Estable
            </div>
          </div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-icon">➕</div>
          <div className="metric-content">
            <div className="metric-label">Productos Agregados</div>
            <div className="metric-value">{formatNumber(stats.estadisticas.productosAgregados)}</div>
            <div className="metric-trend trend-up">
              <span className="trend-icon">↗️</span>
              Hoy
            </div>
          </div>
        </div>

        <div className="metric-card metric-warning">
          <div className="metric-icon">🔄</div>
          <div className="metric-content">
            <div className="metric-label">Productos Actualizados</div>
            <div className="metric-value">{formatNumber(stats.estadisticas.productosActualizados)}</div>
            <div className="metric-trend trend-up">
              <span className="trend-icon">↗️</span>
              Hoy
            </div>
          </div>
        </div>

        <div className="metric-card metric-secondary">
          <div className="metric-icon">📱</div>
          <div className="metric-content">
            <div className="metric-label">Escaneos Realizados</div>
            <div className="metric-value">{formatNumber(stats.estadisticas.escaneos)}</div>
            <div className="metric-trend trend-up">
              <span className="trend-icon">↗️</span>
              Sesión actual
            </div>
          </div>
        </div>

        <div className="metric-card metric-accent">
          <div className="metric-icon">🕒</div>
          <div className="metric-content">
            <div className="metric-label">Último Reinicio</div>
            <div className="metric-value-small">
              {new Date(stats.estadisticas.inicioServidor).toLocaleDateString('es-ES')}
            </div>
            <div className="metric-time">
              {new Date(stats.estadisticas.inicioServidor).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        <div className="footer-stats">
          <span>Última actualización: {new Date().toLocaleTimeString('es-ES')}</span>
          <span>•</span>
          <span>Sistema funcionando correctamente</span>
        </div>
      </div>
    </div>
  );
}

export default DashboardMetrics;
