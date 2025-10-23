import React, { useState, useEffect } from 'react';
import './styles/App.css';
import './styles/Global.css';
import Login from './componentes/Login';
import PuntoVenta from './componentes/PuntoVenta';
import ControlCaja from './componentes/ControlCaja';
import Reportes from './componentes/Reportes';
import Empleados from './componentes/Empleados';
import Inventario from './componentes/Inventario';
import { authService } from './services/authService';
import { Empleado } from './types/pos.types';

function App() {
  const [empleadoActual, setEmpleadoActual] = useState<Empleado | null>(null);
  const [paginaActual, setPaginaActual] = useState('pos');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    verificarAutenticacion();
  }, []);

  const verificarAutenticacion = async () => {
    try {
      const empleado = await authService.obtenerEmpleadoActual();
      setEmpleadoActual(empleado);
    } catch (error) {
      console.log('No hay empleado autenticado');
    } finally {
      setCargando(false);
    }
  };

  const manejarLogin = (empleado: Empleado) => {
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
      caja: ['admin', 'supervisor'],
      reportes: ['admin', 'supervisor'],
      empleados: ['admin']
    };

    return permisos[pagina as keyof typeof permisos]?.includes(empleadoActual.rol) || false;
  };

  // Loading screen
  if (cargando) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>🏪 Cargando MiniMarket Innova...</p>
      </div>
    );
  }

  // Si no hay empleado autenticado, mostrar login
  if (!empleadoActual) {
    return <Login onLogin={manejarLogin} />;
  }

  // Si hay empleado autenticado, mostrar el sistema POS
  const renderPagina = () => {
    switch (paginaActual) {
      case 'pos':
        return <PuntoVenta />;
      case 'inventario':
        return puedeAcceder('inventario') ? <Inventario /> : <SinPermisos />;
      case 'caja':
        return puedeAcceder('caja') ? <ControlCaja /> : <SinPermisos />;
      case 'reportes':
        return puedeAcceder('reportes') ? <Reportes /> : <SinPermisos />;
      case 'empleados':
        return puedeAcceder('empleados') ? <Empleados /> : <SinPermisos />;
      default:
        return <PuntoVenta />;
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>🏪 MiniMarket Innova</h1>
          <span className="version">POS v2.0</span>
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

          <button 
            className={`nav-item ${paginaActual === 'reportes' ? 'active' : ''} ${!puedeAcceder('reportes') ? 'disabled' : ''}`}
            onClick={() => puedeAcceder('reportes') && setPaginaActual('reportes')}
            disabled={!puedeAcceder('reportes')}
          >
            📊 Reportes
          </button>

          <button 
            className={`nav-item ${paginaActual === 'empleados' ? 'active' : ''} ${!puedeAcceder('empleados') ? 'disabled' : ''}`}
            onClick={() => puedeAcceder('empleados') && setPaginaActual('empleados')}
            disabled={!puedeAcceder('empleados')}
          >
            👨‍💼 Empleados
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

// Componente para mostrar cuando no hay permisos
const SinPermisos = () => (
  <div className="sin-permisos">
    <h2>🚫 Acceso Denegado</h2>
    <p>No tienes permisos para acceder a esta sección.</p>
    <p>Contacta a tu administrador si necesitas acceso.</p>
  </div>
);

export default App;