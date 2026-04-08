import React from 'react';
import './styles/App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './componentes/Login';
import PuntoVenta from './componentes/PuntoVenta';
import Inventario from './componentes/Inventario';
import Fiado from './componentes/Fiado';
import DashboardMetrics from './componentes/DashboardMetrics';
import Welcome from './componentes/Welcome';
import './componentes/DashboardMetrics.css';
import './componentes/Welcome.css';

function DashboardContent() {
  const { usuario, logout, isJefe } = useAuth();
  const [paginaActual, setPaginaActual] = React.useState('dashboard');
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const cambiarPagina = (nuevaPagina: string) => {
    console.log('Intentando cambiar página de', paginaActual, 'a', nuevaPagina);
    if (nuevaPagina === paginaActual) {
      console.log('Página ya es la actual, no cambiando');
      return;
    }

    setIsTransitioning(true);
    console.log('Iniciando transición...');

    setTimeout(() => {
      console.log('Cambiando páginaActual a:', nuevaPagina);
      setPaginaActual(nuevaPagina);
      setIsTransitioning(false);
      console.log('Transición completada');
    }, 150);
  };

  const renderPagina = () => {
    console.log('Renderizando página:', paginaActual, 'isJefe:', isJefe, 'isTransitioning:', isTransitioning);

    let paginaComponent;
    switch (paginaActual) {
      case 'dashboard':
        console.log('Renderizando DashboardMetrics');
        paginaComponent = <DashboardMetrics />;
        break;
      case 'punto-venta':
        console.log('Renderizando PuntoVenta');
        paginaComponent = <PuntoVenta />;
        break;
      case 'inventario':
        console.log('Renderizando Inventario, isJefe:', isJefe);
        paginaComponent = isJefe ? <Inventario /> : <div className="sin-permiso">❌ Solo administradores pueden acceder al inventario</div>;
        break;
      case 'fiado':
        console.log('Renderizando Fiado, isJefe:', isJefe);
        paginaComponent = isJefe ? <Fiado /> : <div className="sin-permiso">❌ Solo administradores pueden acceder al sistema Fiado</div>;
        break;
      default:
        console.log('Página por defecto, renderizando DashboardMetrics');
        paginaComponent = <DashboardMetrics />;
    }

    console.log('Componente a renderizar:', paginaComponent ? 'Componente válido' : 'Componente nulo');

    return (
      <div className={`page-container ${isTransitioning ? 'page-transitioning' : 'page-active'}`}>
        {paginaComponent}
      </div>
    );
  };

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="app-logo"></div>
          <div>
            <h1 className="app-title">MiniMarket Innova</h1>
            <span className="version-badge">v2.0</span>
          </div>
        </div>

        <div className="navbar-menu">
          <button
            className={`nav-item ${paginaActual === 'dashboard' ? 'active' : ''}`}
            onClick={() => cambiarPagina('dashboard')}
          >
            📊 Dashboard
          </button>

          <button
            className={`nav-item ${paginaActual === 'punto-venta' ? 'active' : ''}`}
            onClick={() => cambiarPagina('punto-venta')}
          >
            🛒 Punto de Venta
          </button>

          {isJefe && (
            <>
              <button
                className={`nav-item ${paginaActual === 'inventario' ? 'active' : ''}`}
                onClick={() => cambiarPagina('inventario')}
              >
                📦 Inventario
              </button>

              <button
                className={`nav-item ${paginaActual === 'fiado' ? 'active' : ''}`}
                onClick={() => cambiarPagina('fiado')}
              >
                💳 Sistema Fiado
              </button>
            </>
          )}
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <div className="user-avatar">
              {usuario?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{usuario?.nombre}</div>
              <div className="user-role">{isJefe ? '👑 Administrador' : '👤 Empleado'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <span>🚪</span> Salir
          </button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content">
        {renderPagina()}
      </main>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {isAuthenticated ? <DashboardContent /> : <Login />}
    </div>
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}