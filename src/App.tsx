import React from 'react';
import { LogOut } from 'lucide-react';
import './styles/App.css';
import './styles/QuickAccess.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './componentes/auth/Login';
import PuntoVenta from './componentes/ventas/PuntoVenta';
import Inventario from './componentes/inventario/Inventario';
import Fiado from './componentes/fiado/Fiado';
import ControlCaja from './componentes/caja/ControlCaja';
import Reportes from './componentes/ventas/Reportes';
import Empleados from './componentes/personal/Empleados';
import DashboardMetrics from './componentes/dashboard/DashboardMetrics';
import './componentes/dashboard/DashboardMetrics.css';
import Sidebar from './componentes/Sidebar';

function DashboardContent() {
  const { usuario, logout, isJefe } = useAuth();
  const [paginaActual, setPaginaActual] = React.useState('dashboard');
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const cambiarPagina = (nuevaPagina: string) => {
    if (nuevaPagina === paginaActual) {
      return;
    }

    setIsTransitioning(true);

    setTimeout(() => {
      setPaginaActual(nuevaPagina);
      setIsTransitioning(false);
    }, 150);
  };

  const renderPagina = () => {
    let paginaComponent;
    switch (paginaActual) {
      case 'dashboard':
        paginaComponent = <DashboardMetrics />;
        break;
      case 'punto-venta':
        paginaComponent = <PuntoVenta />;
        break;
      case 'inventario':
        paginaComponent = isJefe ? <Inventario /> : <div className="sin-permiso">❌ Solo administradores pueden acceder al inventario</div>;
        break;
      case 'fiado':
        paginaComponent = isJefe ? <Fiado /> : <div className="sin-permiso">❌ Solo administradores pueden acceder al sistema Fiado</div>;
        break;
      case 'caja':
        paginaComponent = isJefe ? <ControlCaja /> : <div className="sin-permiso">❌ Solo administradores pueden acceder al control de caja</div>;
        break;
      case 'reportes':
        paginaComponent = isJefe ? <Reportes /> : <div className="sin-permiso">❌ Solo administradores pueden acceder a reportes</div>;
        break;
      case 'empleados':
        paginaComponent = isJefe ? <Empleados /> : <div className="sin-permiso">❌ Solo administradores pueden acceder a empleados</div>;
        break;
      default:
        paginaComponent = <DashboardMetrics />;
    }

    return (
      <div className={`page-container ${isTransitioning ? 'page-transitioning' : 'page-active'}`}>
        {paginaComponent}
      </div>
    );
  };

  return (
    <div className="app">
      <Sidebar paginaActual={paginaActual} cambiarPagina={cambiarPagina} isJefe={isJefe} />
      <div className="main-layout">
        <nav className="navbar">
          <div className="navbar-brand">
            <div className="app-logo" aria-label="Logo MiniMarket Innova">
              <img src="/assets/branding/logo.png" alt="MiniMarket Innova" className="app-logo-img" />
            </div>
            <div>
              <h1 className="app-title">MiniMarket Innova</h1>
              <span className="version-badge">v2.0</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={14} /> Salir
          </button>
        </nav>
        <main className="main-content">
          {renderPagina()}
        </main>
      </div>
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
