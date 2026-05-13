import React from 'react';
import {
  BadgeDollarSign,
  Briefcase,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  ShoppingCart,
  Users,
  Wallet
} from 'lucide-react';
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
      {/* NAVBAR */}
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

        <div className="navbar-menu">
          <button
            className={`nav-item ${paginaActual === 'dashboard' ? 'active' : ''}`}
            onClick={() => cambiarPagina('dashboard')}
          >
            <span className="nav-item-content"><LayoutDashboard size={16} className="nav-icon" />Dashboard</span>
          </button>

          <button
            className={`nav-item ${paginaActual === 'punto-venta' ? 'active' : ''}`}
            onClick={() => cambiarPagina('punto-venta')}
          >
            <span className="nav-item-content"><ShoppingCart size={16} className="nav-icon" />Punto de Venta</span>
          </button>

          {isJefe && (
            <>
              <button
                className={`nav-item ${paginaActual === 'inventario' ? 'active' : ''}`}
                onClick={() => cambiarPagina('inventario')}
              >
                <span className="nav-item-content"><Package size={16} className="nav-icon" />Inventario</span>
              </button>

              <button
                className={`nav-item ${paginaActual === 'fiado' ? 'active' : ''}`}
                onClick={() => cambiarPagina('fiado')}
              >
                <span className="nav-item-content"><Wallet size={16} className="nav-icon" />Sistema Fiado</span>
              </button>

              <button
                className={`nav-item ${paginaActual === 'caja' ? 'active' : ''}`}
                onClick={() => cambiarPagina('caja')}
              >
                <span className="nav-item-content"><BadgeDollarSign size={16} className="nav-icon" />Caja</span>
              </button>

              <button
                className={`nav-item ${paginaActual === 'reportes' ? 'active' : ''}`}
                onClick={() => cambiarPagina('reportes')}
              >
                <span className="nav-item-content"><ReceiptText size={16} className="nav-icon" />Reportes</span>
              </button>

              <button
                className={`nav-item ${paginaActual === 'empleados' ? 'active' : ''}`}
                onClick={() => cambiarPagina('empleados')}
              >
                <span className="nav-item-content"><Users size={16} className="nav-icon" />Empleados</span>
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
              <div className="user-role">
                {isJefe ? <Briefcase size={13} className="role-icon" /> : <CircleUserRound size={13} className="role-icon" />}
                <span>{isJefe ? 'Administrador' : 'Empleado'}</span>
              </div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content">
        {renderPagina()}
      </main>

      {/* BOTTOM NAV — solo visible en móvil */}
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
              className={`bottom-nav-item ${paginaActual === 'inventario' ? 'active' : ''}`}
              onClick={() => cambiarPagina('inventario')}
            >
              <span className="bottom-nav-icon"><Package size={18} /></span>
              <span className="bottom-nav-label">Inventario</span>
            </button>

            <button
              className={`bottom-nav-item ${paginaActual === 'caja' ? 'active' : ''}`}
              onClick={() => cambiarPagina('caja')}
            >
              <span className="bottom-nav-icon"><BadgeDollarSign size={18} /></span>
              <span className="bottom-nav-label">Caja</span>
            </button>

            <button
              className={`bottom-nav-item ${['fiado','reportes','empleados'].includes(paginaActual) ? 'active' : ''}`}
              onClick={() => {
                const siguiente = paginaActual === 'fiado' ? 'reportes'
                  : paginaActual === 'reportes' ? 'empleados' : 'fiado';
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