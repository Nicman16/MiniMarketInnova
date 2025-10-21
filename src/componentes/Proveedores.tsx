import React, { useState } from 'react';
import '../styles/Proveedores.css';

function Proveedores() {
  const [proveedores, setProveedores] = useState([
    {
      id: 1,
      nombre: 'Distribuidora El Campo',
      categoria: 'Verduras y Frutas',
      telefono: '+57 310 123 4567',
      email: 'ventas@elcampo.com',
      direccion: 'Calle 45 #23-67, Bogotá',
      rating: 4.8,
      icon: '🥬'
    },
    {
      id: 2,
      nombre: 'Carnes Premium S.A.',
      categoria: 'Carnes y Embutidos',
      telefono: '+57 320 987 6543',
      email: 'pedidos@carnespremium.com',
      direccion: 'Carrera 15 #78-90, Medellín',
      rating: 4.5,
      icon: '🥩'
    },
    {
      id: 3,
      nombre: 'Abarrotes La Central',
      categoria: 'Productos Secos',
      telefono: '+57 315 456 7890',
      email: 'info@lacentral.co',
      direccion: 'Avenida 68 #34-12, Cali',
      rating: 4.2,
      icon: '📦'
    },
    {
      id: 4,
      nombre: 'Lácteos del Valle',
      categoria: 'Lácteos y Derivados',
      telefono: '+57 300 789 0123',
      email: 'comercial@lacteovalle.com',
      direccion: 'Zona Industrial, Barranquilla',
      rating: 4.7,
      icon: '🥛'
    }
  ]);

  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: '',
    categoria: '',
    telefono: '',
    email: ''
  });

  const agregarProveedor = () => {
    if (nuevoProveedor.nombre && nuevoProveedor.categoria) {
      const proveedor = {
        ...nuevoProveedor,
        id: proveedores.length + 1,
        direccion: 'Por definir',
        rating: 4.0,
        icon: '🏪'
      };
      setProveedores([...proveedores, proveedor]);
      setNuevoProveedor({ nombre: '', categoria: '', telefono: '', email: '' });
    }
  };

  return (
    <section className="proveedores-section">
      <h2 className="section-title">🚚 Gestión de Proveedores</h2>
      
      <div className="card">
        <h3>Agregar Nuevo Proveedor</h3>
        <div className="form-container">
          <input 
            type="text" 
            className="input"
            placeholder="Nombre del proveedor"
            value={nuevoProveedor.nombre}
            onChange={(e) => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})}
          />
          <input 
            type="text" 
            className="input"
            placeholder="Categoría"
            value={nuevoProveedor.categoria}
            onChange={(e) => setNuevoProveedor({...nuevoProveedor, categoria: e.target.value})}
          />
          <input 
            type="tel" 
            className="input"
            placeholder="Teléfono"
            value={nuevoProveedor.telefono}
            onChange={(e) => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})}
          />
          <input 
            type="email" 
            className="input"
            placeholder="Email"
            value={nuevoProveedor.email}
            onChange={(e) => setNuevoProveedor({...nuevoProveedor, email: e.target.value})}
          />
          <button className="button" onClick={agregarProveedor}>
            Agregar Proveedor
          </button>
        </div>
      </div>

      <div className="supplier-list">
        {proveedores.map(proveedor => (
          <div key={proveedor.id} className="supplier-card">
            <div className="rating">⭐ {proveedor.rating}</div>
            
            <div className="supplier-header">
              <div className="supplier-icon">
                {proveedor.icon}
              </div>
              <div className="supplier-info">
                <h4>{proveedor.nombre}</h4>
                <p>{proveedor.categoria}</p>
              </div>
            </div>

            <div className="contact-info">
              <div className="contact-item">
                📞 {proveedor.telefono}
              </div>
              <div className="contact-item">
                📧 {proveedor.email}
              </div>
              <div className="contact-item">
                📍 {proveedor.direccion}
              </div>
            </div>

            <div className="form-container" style={{ marginTop: '15px' }}>
              <button className="button">Contactar</button>
              <button className="button success">Hacer Pedido</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Proveedores;