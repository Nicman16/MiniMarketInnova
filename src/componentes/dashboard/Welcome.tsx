import React from 'react';
import './Welcome.css';

const Welcome: React.FC = () => {
  const features = [
    {
      icon: '🛒',
      title: 'Punto de Venta',
      description: 'Gestión eficiente de ventas con escaneo de productos'
    },
    {
      icon: '📦',
      title: 'Inventario',
      description: 'Control completo de stock y productos'
    },
    {
      icon: '💳',
      title: 'Sistema Fiado',
      description: 'Administración de créditos y deudas'
    },
    {
      icon: '📊',
      title: 'Reportes',
      description: 'Análisis y estadísticas en tiempo real'
    }
  ];

  return (
    <div className="welcome-container">
      <div className="welcome-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            ¡Bienvenido a <span className="brand-highlight">MiniMarket Innova</span>!
          </h1>
          <p className="hero-subtitle">
            Tu sistema de gestión integral para minimarkets modernos
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Disponibilidad</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Soporte</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">∞</span>
              <span className="stat-label">Escalabilidad</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-elements">
            <div className="floating-card card-1">
              <span className="card-icon">📈</span>
              <span className="card-text">Crecimiento</span>
            </div>
            <div className="floating-card card-2">
              <span className="card-icon">⚡</span>
              <span className="card-text">Velocidad</span>
            </div>
            <div className="floating-card card-3">
              <span className="card-icon">🔒</span>
              <span className="card-text">Seguridad</span>
            </div>
          </div>
        </div>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="welcome-footer">
        <div className="footer-content">
          <h3>¿Listo para revolucionar tu minimarket?</h3>
          <p>Explora las diferentes secciones usando el menú de navegación superior</p>
          <div className="footer-actions">
            <button className="action-btn primary">
              <span>📊</span> Ver Dashboard
            </button>
            <button className="action-btn secondary">
              <span>🛒</span> Ir a Ventas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;