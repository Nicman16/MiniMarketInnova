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
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="dashboard-summary loading">Cargando métricas...</div>;
  }

  if (error || !stats) {
    return <div className="dashboard-summary error">No fue posible cargar métricas: {error}</div>;
  }

  return (
    <section className="dashboard-summary">
      <div className="summary-header">
        <div>
          <h2>📈 Métricas rápidas</h2>
          <p>Información de rendimiento y estado del sistema.</p>
        </div>
        <span className="summary-badge">Actualizado</span>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Productos cargados</span>
          <strong className="metric-value">{stats.productos}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Dispositivos conectados</span>
          <strong className="metric-value">{stats.dispositivos}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Productos agregados</span>
          <strong className="metric-value">{stats.estadisticas.productosAgregados}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Productos actualizados</span>
          <strong className="metric-value">{stats.estadisticas.productosActualizados}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Escaneos</span>
          <strong className="metric-value">{stats.estadisticas.escaneos}</strong>
        </div>
        <div className="metric-card metric-card-small">
          <span className="metric-label">Último reinicio</span>
          <strong className="metric-value">{new Date(stats.estadisticas.inicioServidor).toLocaleString()}</strong>
        </div>
      </div>
    </section>
  );
}

export default DashboardMetrics;
