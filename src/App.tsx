import React, { useState, useEffect } from 'react';
import './styles/App.css';
import Login from './componentes/Login';
import PuntoVenta from './componentes/PuntoVenta';
import ControlCaja from './componentes/ControlCaja';
import Inventario from './componentes/Inventario';
import { authService } from './services/authService';
import { Empleado } from './types/pos.types';

function App() {
  const [empleadoActual, setEmpleadoActual] = useState<Empleado | null>(null);
  const [paginaActual, setPaginaActual] = useState('pos');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // FORZAR LOGOUT AL INICIO (temporal para debugging)
    localStorage.clear();
    
    verificarAutenticacion();
  }, []);

  const verificarAutenticacion = async () => {
    try {
      const empleado = await authService.obtenerEmpleadoActual();
      setEmpleadoActual(empleado);
    } catch (error) {
      console.log('No hay empleado autenticado - mostrando login');
      setEmpleadoActual(null); // Forzar null para mostrar login
    } finally {
      setCargando(false);
    }
  };

  const manejarLogin = (empleado: Empleado) => {
    console.log('Login exitoso:', empleado);
    setEmpleadoActual(empleado);
    setPaginaActual('pos');
  };

  const manejarLogout = async () => {
    await authService.logout();
    setEmpleadoActual(null);
    setPaginaActual('pos');
  };

  const puedeAcceder = (pagina: string): boolean => {
    if (!empleadoActual) return false;
    
    const permisos = {
      pos: ['admin', 'supervisor', 'vendedor'],
      inventario: ['admin', 'supervisor'],
      caja: ['admin', 'supervisor']
    };

    return permisos[pagina as keyof typeof permisos]?.includes(empleadoActual.rol) || false;
  };

  // DEBUG: Mostrar estado actual
  console.log('🔍 Estado actual:', {
    cargando,
    empleadoActual,
    paginaActual
  });

  // LOADING
  if (cargando) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">🏪 Cargando MiniMarket Innova...</p>
      </div>
    );
  }

  // LOGIN (FORZADO)
  if (!empleadoActual) {
    console.log('✅ Mostrando LOGIN - sin empleado autenticado');
    return <Login onLogin={manejarLogin} />;
  }

  // RENDERIZAR PÁGINAS
  const renderPagina = () => {
    switch (paginaActual) {
      case 'pos':
        return <PuntoVenta />;
      case 'inventario':
        return puedeAcceder('inventario') ? <Inventario /> : <SinPermisos />;
      case 'caja':
        return puedeAcceder('caja') ? <ControlCaja /> : <SinPermisos />;
      default:
        return <PuntoVenta />;
    }
  };

  console.log('✅ Mostrando SISTEMA PRINCIPAL');
  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1 className="app-title">🏪 MiniMarket Innova</h1>
          <span className="version-badge">POS v2.0</span>
        </div>

        <div className="navbar-menu">
          <button 
            className={`nav-item ${paginaActual === 'pos' ? 'active' : ''}`}
            onClick={() => setPaginaActual('pos')}
          >
            🛒 Punto de Venta
          </button>

          <button 
            className={`nav-item ${paginaActual === 'inventario' ? 'active' : ''} ${!puedeAcceder('inventario') ? 'disabled' : ''}`}
            onClick={() => puedeAcceder('inventario') && setPaginaActual('inventario')}
            disabled={!puedeAcceder('inventario')}
          >
            📦 Inventario
          </button>

          <button 
            className={`nav-item ${paginaActual === 'caja' ? 'active' : ''} ${!puedeAcceder('caja') ? 'disabled' : ''}`}
            onClick={() => puedeAcceder('caja') && setPaginaActual('caja')}
            disabled={!puedeAcceder('caja')}
          >
            💵 Caja
          </button>
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <div className="user-avatar">
              {empleadoActual.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{empleadoActual.nombre}</span>
              <span className="user-role">
                {empleadoActual.rol === 'admin' ? '👑 Admin' : 
                 empleadoActual.rol === 'supervisor' ? '🔧 Supervisor' : '🛒 Vendedor'}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={manejarLogout}>
            🚪 Salir
          </button>
        </div>
      </nav>

      <main className="main-content">
        {renderPagina()}
      </main>
    </div>
  );
}

const SinPermisos = () => (
  <div className="sin-permisos">
    <h2 className="sin-permisos-title">🚫 Acceso Denegado</h2>
    <p className="sin-permisos-text">No tienes permisos para acceder a esta sección.</p>
    <p className="sin-permisos-text">Contacta a tu administrador si necesitas acceso.</p>
  </div>
);

export default App;