import React from 'react';
import { BadgeDollarSign, LayoutDashboard, LogOut, ReceiptText, ShoppingCart, Users, Wallet } from 'lucide-react';
import './styles/App.css';
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
  const { logout, isJefe } = useAuth();
  const [paginaActual, setPaginaActual] = React.useState<string>('dashboard');
  const [isTransitioning, setIsTransitioning] = React.useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(false);

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
    let paginaComponent: React.ReactNode;

    switch (paginaActual) {
      case 'dashboard':
        paginaComponent = <DashboardMetrics />;
        break;
      case 'punto-venta':
        paginaComponent = <PuntoVenta />;
        break;
      case 'inventario':
        paginaComponent = isJefe ? <Inventario /> : <div className="sin-permiso">Solo administradores pueden acceder al inventario</div>;
        break;
      case 'fiado':
        paginaComponent = isJefe ? <Fiado /> : <div className="sin-permiso">Solo administradores pueden acceder al sistema Fiado</div>;
        break;
      case 'caja':
        paginaComponent = isJefe ? <ControlCaja /> : <div className="sin-permiso">Solo administradores pueden acceder al control de caja</div>;
        break;
      case 'reportes':
        paginaComponent = isJefe ? <Reportes /> : <div className="sin-permiso">Solo administradores pueden acceder a reportes</div>;
        break;
      case 'empleados':
        paginaComponent = isJefe ? <Empleados /> : <div className="sin-permiso">Solo administradores pueden acceder a empleados</div>;
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
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        paginaActual={paginaActual}
        cambiarPagina={cambiarPagina}
        isJefe={isJefe}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
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
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item ${paginaActual === 'dashboard' ? 'active' : ''}`}
          onClick={() => cambiarPagina('dashboard')}
        >
          <span className="bottom-nav-icon"><LayoutDashboard size={18} /></span>
          <span className="bottom-nav-label">Dashboard</span>
        </button>

        <button
          className={`bottom-nav-item ${paginaActual === 'punto-venta' ? 'active' : ''}`}
          onClick={() => cambiarPagina('punto-venta')}
        >
          <span className="bottom-nav-icon"><ShoppingCart size={18} /></span>
          <span className="bottom-nav-label">Venta</span>
        </button>

        {isJefe && (
          <>
            <button
              className={`bottom-nav-item ${paginaActual === 'caja' ? 'active' : ''}`}
              onClick={() => cambiarPagina('caja')}
            >
              <span className="bottom-nav-icon"><BadgeDollarSign size={18} /></span>
              <span className="bottom-nav-label">Caja</span>
            </button>

            <button
              className={`bottom-nav-item ${['fiado', 'reportes', 'empleados'].includes(paginaActual) ? 'active' : ''}`}
              onClick={() => {
                const siguiente = paginaActual === 'fiado'
                  ? 'reportes'
                  : paginaActual === 'reportes'
                    ? 'empleados'
                    : 'fiado';
                cambiarPagina(siguiente);
              }}
            >
              <span className="bottom-nav-icon">
                {paginaActual === 'reportes'
                  ? <ReceiptText size={18} />
                  : paginaActual === 'empleados'
                    ? <Users size={18} />
                    : <Wallet size={18} />}
              </span>
              <span className="bottom-nav-label">
                {paginaActual === 'reportes' ? 'Reportes' : paginaActual === 'empleados' ? 'Equipo' : 'Fiado'}
              </span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();
  return <div>{isAuthenticated ? <DashboardContent /> : <Login />}</div>;
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
