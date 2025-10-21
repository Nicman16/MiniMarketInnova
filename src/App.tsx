import React, { useState } from 'react';
import './styles/App.css';
import Inventario from './componentes/Inventario';
import Precios from './componentes/Precios';
import Personal from './componentes/Personal';
import Proveedores from './componentes/Proveedores';

function App() {
  const [activeSection, setActiveSection] = useState('inventario');

  const renderActiveSection = () => {
    switch(activeSection) {
      case 'inventario': return <Inventario />;
      case 'precios': return <Precios />;
      case 'personal': return <Personal />;
      case 'proveedores': return <Proveedores />;
      default: return <Inventario />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🛒 MiniMarket Innova</h1>
        <p className="app-subtitle">Sistema de Gestión Integral</p>
      </header>
      
      <nav className="navigation">
        <button 
          className={`nav-button ${activeSection === 'inventario' ? 'active' : ''}`}
          onClick={() => setActiveSection('inventario')}
        >
          📦 Inventario
        </button>
        <button 
          className={`nav-button ${activeSection === 'precios' ? 'active' : ''}`}
          onClick={() => setActiveSection('precios')}
        >
          💰 Precios
        </button>
        <button 
          className={`nav-button ${activeSection === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveSection('personal')}
        >
          👥 Personal
        </button>
        <button 
          className={`nav-button ${activeSection === 'proveedores' ? 'active' : ''}`}
          onClick={() => setActiveSection('proveedores')}
        >
          🚚 Proveedores
        </button>
      </nav>
      
      <div className="content-area">
        {renderActiveSection()}
      </div>
    </div>
  );
}

export default App;