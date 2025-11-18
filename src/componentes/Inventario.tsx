// src/componentes/Inventario.tsx - Sistema completo
import React, { useState, useEffect } from 'react';
import '../styles/Inventario.css';
import EscanerZXing from './EscanerZXing';
import EstadisticasAvanzadas from './EstadisticasAvanzadas';

interface Producto {
  id: number;
  nombre: string;
  codigoBarras: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  margen: number;
  proveedor: string;
  proveedorId: number;
  fechaVencimiento?: string;
  ubicacion: string;
  imagen?: string;
  descripcion?: string;
  estado: 'activo' | 'descontinuado' | 'agotado';
  fechaCreacion: string;
  ultimaActualizacion: string;
}

interface Proveedor {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  productos: number[];
}

function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [vistaActual, setVistaActual] = useState<'productos' | 'proveedores' | 'estadisticas'>('productos');
  const [filtros, setFiltros] = useState({
    busqueda: '',
    categoria: '',
    proveedor: '',
    estado: 'todos'
  });
  const [escanerActivo, setEscanerActivo] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [modalActivo, setModalActivo] = useState<'agregar' | 'editar' | 'proveedor' | null>(null);

  // Datos iniciales
  useEffect(() => {
    setProveedores([
      {
        id: 1,
        nombre: 'Distribuidora Central',
        contacto: 'Carlos Rodríguez',
        telefono: '300-123-4567',
        email: 'carlos@distribuidora.com',
        direccion: 'Calle 45 #12-34, Bogotá',
        productos: [1, 2, 3]
      },
      {
        id: 2,
        nombre: 'Alimentos del Valle',
        contacto: 'María González',
        telefono: '301-987-6543',
        email: 'maria@alimentosvalle.com',
        direccion: 'Carrera 15 #67-89, Cali',
        productos: [4, 5]
      }
    ]);

    setProductos([
      {
        id: 1,
        nombre: 'Arroz Diana Premium 500g',
        codigoBarras: '7702001001234',
        categoria: 'Granos y Cereales',
        stock: 45,
        stockMinimo: 10,
        precioCompra: 1800,
        precioVenta: 2500,
        margen: 38.9,
        proveedor: 'Distribuidora Central',
        proveedorId: 1,
        ubicacion: 'Pasillo A - Estante 1',
        imagen: 'https://via.placeholder.com/300x200/667eea/white?text=ARROZ',
        descripcion: 'Arroz premium de grano largo, ideal para toda ocasión',
        estado: 'activo',
        fechaCreacion: new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString()
      },
      {
        id: 2,
        nombre: 'Aceite Gourmet Girasol 1L',
        codigoBarras: '7702002001235',
        categoria: 'Aceites y Vinagres',
        stock: 28,
        stockMinimo: 5,
        precioCompra: 3200,
        precioVenta: 4500,
        margen: 40.6,
        proveedor: 'Distribuidora Central',
        proveedorId: 1,
        ubicacion: 'Pasillo B - Estante 2',
        imagen: 'https://via.placeholder.com/300x200/28a745/white?text=ACEITE',
        descripcion: 'Aceite de girasol 100% puro, ideal para freír y cocinar',
        estado: 'activo',
        fechaCreacion: new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString()
      },
      {
        id: 3,
        nombre: 'Azúcar Incauca Refinada 1kg',
        codigoBarras: '7702003001236',
        categoria: 'Endulzantes',
        stock: 8,
        stockMinimo: 15,
        precioCompra: 2100,
        precioVenta: 3200,
        margen: 52.4,
        proveedor: 'Distribuidora Central',
        proveedorId: 1,
        fechaVencimiento: '2025-12-31',
        ubicacion: 'Pasillo A - Estante 3',
        imagen: 'https://via.placeholder.com/300x200/ffc107/white?text=AZUCAR',
        descripcion: 'Azúcar refinada de alta calidad',
        estado: 'agotado',
        fechaCreacion: new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString()
      }
    ]);
  }, []);

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const coincideBusqueda = producto.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
                            producto.codigoBarras.includes(filtros.busqueda);
    const coincideCategoria = !filtros.categoria || producto.categoria === filtros.categoria;
    const coincideProveedor = !filtros.proveedor || producto.proveedor === filtros.proveedor;
    const coincideEstado = filtros.estado === 'todos' || producto.estado === filtros.estado;
    
    return coincideBusqueda && coincideCategoria && coincideProveedor && coincideEstado;
  });

  // Obtener categorías únicas
  const categorias = [...new Set(productos.map(p => p.categoria))];
  
  // Obtener proveedores únicos
  const nombresProveedores = [...new Set(productos.map(p => p.proveedor))];

  // Estadísticas
  const estadisticas = {
    totalProductos: productos.length,
    productosActivos: productos.filter(p => p.estado === 'activo').length,
    productosAgotados: productos.filter(p => p.stock <= p.stockMinimo).length,
    valorInventario: productos.reduce((total, p) => total + (p.stock * p.precioVenta), 0),
    margenPromedio: productos.reduce((total, p) => total + p.margen, 0) / productos.length
  };

  const manejarEscaneo = (codigo: string) => {
    console.log('🔍 Código escaneado en inventario:', codigo);
    // El escáner ya procesó el producto automáticamente
  };

  const manejarProductoEncontrado = (producto: Producto) => {
    console.log('✅ Producto procesado:', producto);
    setProductoSeleccionado(producto);
    setModalActivo('editar');
    setEscanerActivo(false);
  };

  const manejarProductoNoEncontrado = (codigo: string) => {
    console.log('❓ Producto no encontrado:', codigo);
    // Abrir modal para crear nuevo producto
    setModalActivo('agregar');
    setEscanerActivo(false);
  };

  return (
    <div className="inventario-container">
      {/* Header con navegación */}
      <header className="inventario-header">
        <div className="header-title">
          <h1>📦 Sistema de Inventario</h1>
          <p>Gestión completa de productos y proveedores</p>
        </div>
        
        <nav className="inventario-nav">
          <button 
            className={`nav-btn ${vistaActual === 'productos' ? 'active' : ''}`}
            onClick={() => setVistaActual('productos')}
          >
            📦 Productos
          </button>
          <button 
            className={`nav-btn ${vistaActual === 'proveedores' ? 'active' : ''}`}
            onClick={() => setVistaActual('proveedores')}
          >
            🏢 Proveedores
          </button>
          <button 
            className={`nav-btn ${vistaActual === 'estadisticas' ? 'active' : ''}`}
            onClick={() => setVistaActual('estadisticas')}
          >
            📊 Estadísticas
          </button>
        </nav>
      </header>

      {/* Vista de Productos */}
      {vistaActual === 'productos' && (
        <div className="productos-section">
          {/* Barra de herramientas */}
          <div className="toolbar">
            <div className="search-filters">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nombre o código..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                  className="search-input"
                />
              </div>
              
              <select 
                value={filtros.categoria}
                onChange={(e) => setFiltros({...filtros, categoria: e.target.value})}
                className="filter-select"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select 
                value={filtros.proveedor}
                onChange={(e) => setFiltros({...filtros, proveedor: e.target.value})}
                className="filter-select"
              >
                <option value="">Todos los proveedores</option>
                {nombresProveedores.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>

              <select 
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                className="filter-select"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="agotado">Agotados</option>
                <option value="descontinuado">Descontinuados</option>
              </select>
            </div>

            <div className="action-buttons">
              <button 
                className="btn-scanner"
                onClick={() => setEscanerActivo(!escanerActivo)}
              >
                {escanerActivo ? '❌ Cerrar' : '📱 Escáner'}
              </button>
              <button 
                className="btn-add"
                onClick={() => setModalActivo('agregar')}
              >
                ➕ Nuevo Producto
              </button>
            </div>
          </div>

          {/* Escáner */}
          {escanerActivo && (
            <div className="scanner-container">
              <EscanerZXing 
                onScan={manejarEscaneo}
                onProductoEncontrado={manejarProductoEncontrado}
                onProductoNoEncontrado={manejarProductoNoEncontrado}
                productos={productos}
                isActive={escanerActivo}
              />
            </div>
          )}

          {/* Resumen rápido */}
          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <span className="stat-number">{estadisticas.totalProductos}</span>
                <span className="stat-label">Total Productos</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <span className="stat-number">{estadisticas.productosActivos}</span>
                <span className="stat-label">Activos</span>
              </div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon">⚠️</div>
              <div className="stat-info">
                <span className="stat-number">{estadisticas.productosAgotados}</span>
                <span className="stat-label">Stock Bajo</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <span className="stat-number">${estadisticas.valorInventario.toLocaleString()}</span>
                <span className="stat-label">Valor Total</span>
              </div>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="productos-grid">
            {productosFiltrados.map(producto => (
              <ProductCard 
                key={producto.id} 
                producto={producto}
                onEdit={() => {
                  setProductoSeleccionado(producto);
                  setModalActivo('editar');
                }}
              />
            ))}
          </div>

          {productosFiltrados.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No se encontraron productos</h3>
              <p>Ajusta los filtros o agrega nuevos productos</p>
            </div>
          )}
        </div>
      )}

      {/* Vista de Proveedores */}
      {vistaActual === 'proveedores' && (
        <ProveedoresSection 
          proveedores={proveedores}
          onAddProveedor={() => setModalActivo('proveedor')}
        />
      )}

      {/* Vista de Estadísticas */}
      {vistaActual === 'estadisticas' && (
        <EstadisticasAvanzadas 
          productos={productos}
          proveedores={proveedores}
        />
      )}
    </div>
  );
}

// Componente para tarjeta de producto
const ProductCard: React.FC<{producto: Producto, onEdit: () => void}> = ({producto, onEdit}) => {
  const stockStatus = producto.stock <= producto.stockMinimo ? 'danger' : 
                     producto.stock <= producto.stockMinimo * 2 ? 'warning' : 'good';

  return (
    <div className={`product-card ${producto.estado}`}>
      <div className="product-image">
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre} />
        ) : (
          <div className="image-placeholder">📦</div>
        )}
        <span className={`stock-badge ${stockStatus}`}>
          {producto.stock} und
        </span>
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{producto.nombre}</h3>
        <p className="product-category">{producto.categoria}</p>
        <div className="product-code">{producto.codigoBarras}</div>
        
        <div className="product-pricing">
          <div className="price-row">
            <span>Compra: ${producto.precioCompra.toLocaleString()}</span>
            <span>Venta: ${producto.precioVenta.toLocaleString()}</span>
          </div>
          <div className="margin-info">
            Margen: <strong>{producto.margen.toFixed(1)}%</strong>
          </div>
        </div>
        
        <div className="product-details">
          <div className="detail-item">
            <span className="detail-icon">🏢</span>
            <span>{producto.proveedor}</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">📍</span>
            <span>{producto.ubicacion}</span>
          </div>
          {producto.fechaVencimiento && (
            <div className="detail-item">
              <span className="detail-icon">📅</span>
              <span>Vence: {new Date(producto.fechaVencimiento).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        
        <div className="product-actions">
          <button className="btn-edit" onClick={onEdit}>
            ✏️ Editar
          </button>
          <button className={`btn-status ${producto.estado}`}>
            {producto.estado === 'activo' ? '✅ Activo' :
             producto.estado === 'agotado' ? '❌ Agotado' : '🚫 Descontinuado'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para sección de proveedores
const ProveedoresSection: React.FC<{proveedores: Proveedor[], onAddProveedor: () => void}> = 
({proveedores, onAddProveedor}) => {
  return (
    <div className="proveedores-section">
      <div className="section-header">
        <h2>🏢 Gestión de Proveedores</h2>
        <button className="btn-add" onClick={onAddProveedor}>
          ➕ Nuevo Proveedor
        </button>
      </div>
      
      <div className="proveedores-grid">
        {proveedores.map(proveedor => (
          <div key={proveedor.id} className="proveedor-card">
            <div className="proveedor-header">
              <h3>{proveedor.nombre}</h3>
              <span className="productos-count">
                {proveedor.productos.length} productos
              </span>
            </div>
            
            <div className="proveedor-contact">
              <div className="contact-item">
                <span className="contact-icon">👤</span>
                <span>{proveedor.contacto}</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span>{proveedor.telefono}</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <span>{proveedor.email}</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <span>{proveedor.direccion}</span>
              </div>
            </div>
            
            <div className="proveedor-actions">
              <button className="btn-edit">✏️ Editar</button>
              <button className="btn-view">👁️ Ver Productos</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Inventario;