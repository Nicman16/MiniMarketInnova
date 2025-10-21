import React, { useState } from 'react';
import '../styles/Inventario.css';
import EscanerCodigoBarras from './EscanerCodigoBarras';

interface Producto {
  id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  codigoBarras: string;
  imagen?: string;
  categoria: string;
  modificado?: boolean;
}

function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([
    { 
      id: 1, 
      nombre: 'Arroz Diana 500g', 
      cantidad: 50, 
      precio: 2500, 
      codigoBarras: '7702001001234',
      categoria: 'Granos',
      imagen: 'https://via.placeholder.com/150x150/667eea/white?text=ARROZ'
    },
    { 
      id: 2, 
      nombre: 'Aceite Gourmet 1L', 
      cantidad: 30, 
      precio: 4500, 
      codigoBarras: '7702002001235',
      categoria: 'Aceites',
      imagen: 'https://via.placeholder.com/150x150/28a745/white?text=ACEITE'
    },
    { 
      id: 3, 
      nombre: 'Azúcar Incauca 1kg', 
      cantidad: 25, 
      precio: 3200, 
      codigoBarras: '7702003001236',
      categoria: 'Dulces',
      imagen: 'https://via.placeholder.com/150x150/ffc107/white?text=AZUCAR'
    }
  ]);

  const [formulario, setFormulario] = useState({
    nombre: '',
    cantidad: '',
    precio: '',
    codigoBarras: '',
    categoria: '',
    imagen: ''
  });

  const [escanerActivo, setEscanerActivo] = useState(false);
  const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  const manejarEscaneo = (codigo: string) => {
    console.log('Código escaneado:', codigo);
    
    // Buscar producto existente
    const productoExistente = productos.find(p => p.codigoBarras === codigo);
    
    if (productoExistente) {
      setProductoEncontrado(productoExistente);
      setFormulario({
        nombre: productoExistente.nombre,
        cantidad: productoExistente.cantidad.toString(),
        precio: productoExistente.precio.toString(),
        codigoBarras: productoExistente.codigoBarras,
        categoria: productoExistente.categoria,
        imagen: productoExistente.imagen || ''
      });
      setModoEdicion(true);
    } else {
      // Producto nuevo
      setFormulario({
        ...formulario,
        codigoBarras: codigo
      });
      setProductoEncontrado(null);
      setModoEdicion(false);
    }
    
    setEscanerActivo(false);
  };

  const agregarOActualizarProducto = () => {
    if (!formulario.nombre || !formulario.cantidad || !formulario.precio || !formulario.codigoBarras) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    const datosProducto = {
      nombre: formulario.nombre,
      cantidad: parseInt(formulario.cantidad),
      precio: parseInt(formulario.precio),
      codigoBarras: formulario.codigoBarras,
      categoria: formulario.categoria,
      imagen: formulario.imagen,
      modificado: true
    };

    if (modoEdicion && productoEncontrado) {
      // Actualizar producto existente
      setProductos(productos.map(p => 
        p.id === productoEncontrado.id 
          ? { ...p, ...datosProducto }
          : p
      ));
      alert('¡Producto actualizado exitosamente!');
    } else {
      // Agregar nuevo producto
      const nuevoProducto = {
        ...datosProducto,
        id: Date.now() // ID único basado en timestamp
      };
      setProductos([...productos, nuevoProducto]);
      alert('¡Producto agregado exitosamente!');
    }

    // Limpiar formulario
    setFormulario({
      nombre: '',
      cantidad: '',
      precio: '',
      codigoBarras: '',
      categoria: '',
      imagen: ''
    });
    setProductoEncontrado(null);
    setModoEdicion(false);
  };

  const eliminarProducto = (id: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      setProductos(productos.filter(producto => producto.id !== id));
    }
  };

  const limpiarFormulario = () => {
    setFormulario({
      nombre: '',
      cantidad: '',
      precio: '',
      codigoBarras: '',
      categoria: '',
      imagen: ''
    });
    setProductoEncontrado(null);
    setModoEdicion(false);
  };

  return (
    <section className="inventario-section">
      <h2 className="section-title">📦 Gestión de Inventario</h2>
      
      {/* Escáner de código de barras */}
      <div className="card">
        <h3>📱 Escanear Código de Barras</h3>
        <button 
          className={`button ${escanerActivo ? 'danger' : 'success'}`}
          onClick={() => setEscanerActivo(!escanerActivo)}
        >
          {escanerActivo ? '❌ Cerrar Escáner' : '📷 Activar Escáner'}
        </button>
        
        {escanerActivo && (
          <EscanerCodigoBarras 
            onScan={manejarEscaneo}
            isActive={escanerActivo}
          />
        )}
      </div>

      {/* Formulario de producto */}
      <div className="card">
        <h3>
          {modoEdicion ? '✏️ Editar Producto' : '➕ Agregar Nuevo Producto'}
        </h3>
        
        {productoEncontrado && modoEdicion && (
          <div className="producto-modificado">
            ✅ Producto encontrado en la base de datos. Puedes modificar los datos.
          </div>
        )}

        <div className="form-container">
          <input 
            type="text" 
            className="input"
            placeholder="Código de barras"
            value={formulario.codigoBarras}
            onChange={(e) => setFormulario({...formulario, codigoBarras: e.target.value})}
          />
          <input 
            type="text" 
            className="input"
            placeholder="Nombre del producto *"
            value={formulario.nombre}
            onChange={(e) => setFormulario({...formulario, nombre: e.target.value})}
          />
          <input 
            type="number" 
            className="input"
            placeholder="Cantidad *"
            value={formulario.cantidad}
            onChange={(e) => setFormulario({...formulario, cantidad: e.target.value})}
          />
          <input 
            type="number" 
            className="input"
            placeholder="Precio *"
            value={formulario.precio}
            onChange={(e) => setFormulario({...formulario, precio: e.target.value})}
          />
          <input 
            type="text" 
            className="input"
            placeholder="Categoría"
            value={formulario.categoria}
            onChange={(e) => setFormulario({...formulario, categoria: e.target.value})}
          />
          <input 
            type="url" 
            className="input"
            placeholder="URL de imagen (opcional)"
            value={formulario.imagen}
            onChange={(e) => setFormulario({...formulario, imagen: e.target.value})}
          />
        </div>

        <div className="form-container">
          <button className="button" onClick={agregarOActualizarProducto}>
            {modoEdicion ? '💾 Actualizar Producto' : '➕ Agregar Producto'}
          </button>
          <button className="button" onClick={limpiarFormulario}>
            🧹 Limpiar Formulario
          </button>
        </div>

        {/* Vista previa del producto */}
        {(formulario.nombre || formulario.codigoBarras) && (
          <div className="producto-detalle">
            <div className={`producto-imagen ${!formulario.imagen ? 'placeholder' : ''}`}>
              {formulario.imagen ? (
                <img 
                  src={formulario.imagen} 
                  alt={formulario.nombre}
                  className="producto-imagen"
                />
              ) : (
                '📦'
              )}
            </div>
            <div className="producto-info">
              <h4>{formulario.nombre || 'Producto sin nombre'}</h4>
              <div className="codigo-barras">{formulario.codigoBarras || 'Sin código'}</div>
              <p><strong>Cantidad:</strong> {formulario.cantidad || 0} unidades</p>
              <p><strong>Precio:</strong> ${parseInt(formulario.precio || '0').toLocaleString()}</p>
              <p><strong>Categoría:</strong> {formulario.categoria || 'Sin categoría'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de productos */}
      <div className="card">
        <h3>🛍️ Productos en Stock ({productos.length})</h3>
        <div className="product-list">
          {productos.map(producto => (
            <div key={producto.id} className="product-card">
              <div className={`producto-imagen ${!producto.imagen ? 'placeholder' : ''}`}>
                {producto.imagen ? (
                  <img 
                    src={producto.imagen} 
                    alt={producto.nombre}
                    className="producto-imagen"
                  />
                ) : (
                  '📦'
                )}
              </div>
              <h4>{producto.nombre}</h4>
              <div className="codigo-barras">{producto.codigoBarras}</div>
              <p><strong>Cantidad:</strong> {producto.cantidad} unidades</p>
              <p><strong>Precio:</strong> ${producto.precio.toLocaleString()}</p>
              <p><strong>Categoría:</strong> {producto.categoria}</p>
              {producto.modificado && (
                <div style={{color: '#28a745', fontSize: '0.8rem'}}>
                  ✅ Modificado recientemente
                </div>
              )}
              <button 
                className="button danger" 
                onClick={() => eliminarProducto(producto.id)}
              >
                🗑️ Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Inventario;