import React from 'react';
import './styles/App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './componentes/Login';
import PuntoVenta from './componentes/PuntoVenta';
import Inventario from './componentes/Inventario';

function DashboardContent() {
  const { usuario, logout, isJefe } = useAuth();
  const [paginaActual, setPaginaActual] = React.useState('punto-venta');

  const renderPagina = () => {
    switch (paginaActual) {
      case 'punto-venta':
        return <PuntoVenta />;
      case 'inventario':
        return isJefe ? <Inventario /> : <div className="sin-permiso">❌ Solo jefes pueden acceder al inventario</div>;
      case 'fiado':
        return <div className="seccion-no-implementada">🔄 Sistema de Fiado (en desarrollo)</div>;
      default:
        return <PuntoVenta />;
    }
  };

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-left">
          <h1 className="app-title">🏪 MiniMarket Innova</h1>
        </div>

        <div className="navbar-center">
          <button 
            className={`nav-btn ${paginaActual === 'punto-venta' ? 'active' : ''}`}
            onClick={() => setPaginaActual('punto-venta')}
          >
            🛒 Punto de Venta
          </button>

          {isJefe && (
            <>
              <button 
                className={`nav-btn ${paginaActual === 'inventario' ? 'active' : ''}`}
                onClick={() => setPaginaActual('inventario')}
              >
                📦 Inventario
              </button>
              
              <button 
                className={`nav-btn ${paginaActual === 'fiado' ? 'active' : ''}`}
                onClick={() => setPaginaActual('fiado')}
              >
                💳 Fiado
              </button>
            </>
          )}
        </div>

        <div className="navbar-right">
          <div className="user-info">
            <span className="user-name">{usuario?.nombre}</span>
            <span className={`user-badge ${isJefe ? 'jefe' : 'empleado'}`}>
              {isJefe ? '👑 Jefe' : '👤 Empleado'}
            </span>
          </div>
          <button className="logout-btn" onClick={logout}>
            🚪 Salir
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