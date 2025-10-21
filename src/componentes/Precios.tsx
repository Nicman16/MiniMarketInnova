import React, { useState } from 'react';
import '../styles/Precios.css';

function Precios() {
  const [precios, setPrecios] = useState([
    { id: 1, producto: 'Tomate', categoria: 'verduras', precio: 4500, unidad: 'kg' },
    { id: 2, producto: 'Lechuga', categoria: 'verduras', precio: 2800, unidad: 'kg' },
    { id: 3, producto: 'Zanahoria', categoria: 'verduras', precio: 3200, unidad: 'kg' },
    { id: 4, producto: 'Pollo', categoria: 'carnes', precio: 8500, unidad: 'kg' },
    { id: 5, producto: 'Carne de Res', categoria: 'carnes', precio: 18000, unidad: 'kg' },
    { id: 6, producto: 'Cerdo', categoria: 'carnes', precio: 12000, unidad: 'kg' },
    { id: 7, producto: 'Papa Criolla', categoria: 'papas', precio: 3500, unidad: 'kg' },
    { id: 8, producto: 'Papa Sabanera', categoria: 'papas', precio: 2800, unidad: 'kg' }
  ]);

  const actualizarPrecio = (id: number, nuevoPrecio: number) => {
    setPrecios(precios.map(item => 
      item.id === id ? { ...item, precio: nuevoPrecio } : item
    ));
  };

  const getCategoryClass = (categoria: string) => {
    return `category-badge category-${categoria}`;
  };

  return (
    <section className="precios-section">
      <h2 className="section-title">💰 Precios por Kilo</h2>
      
      <div className="card">
        <h3>Gestión de Precios en Tiempo Real</h3>
        <p>Actualiza los precios de verduras, papas y carnes según el mercado.</p>
        
        <table className="price-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio por {precios[0]?.unidad}</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {precios.map(item => (
              <tr key={item.id}>
                <td>{item.producto}</td>
                <td>
                  <span className={getCategoryClass(item.categoria)}>
                    {item.categoria.toUpperCase()}
                  </span>
                </td>
                <td>
                  <input 
                    type="number" 
                    className="price-input"
                    value={item.precio}
                    onChange={(e) => actualizarPrecio(item.id, parseInt(e.target.value))}
                  />
                </td>
                <td>
                  <button className="button">Actualizar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Resumen por Categorías</h3>
        <div className="form-container">
          <div>
            <strong>🥬 Verduras:</strong> {precios.filter(p => p.categoria === 'verduras').length} productos
          </div>
          <div>
            <strong>🥩 Carnes:</strong> {precios.filter(p => p.categoria === 'carnes').length} productos
          </div>
          <div>
            <strong>🥔 Papas:</strong> {precios.filter(p => p.categoria === 'papas').length} productos
          </div>
        </div>
      </div>
    </section>
  );
}

export default Precios;