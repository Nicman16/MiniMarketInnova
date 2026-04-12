// src/componentes/Inventario.tsx - Sistema completo
import React, { useState, useEffect } from 'react';
import '../styles/Inventario.css';
import { Producto } from '../types/pos.types';
import EscanerZXing from './EscanerZXing';
import EstadisticasAvanzadas from './EstadisticasAvanzadas';

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
  const [productoForm, setProductoForm] = useState<Partial<Producto>>({});

  const abrirModalAgregar = () => {
    setProductoSeleccionado(null);
    setProductoForm({
      nombre: '', codigoBarras: '', categoria: '', stock: 0, stockMinimo: 0,
      precioCompra: 0, precioVenta: 0, margen: 0, proveedor: '', proveedorId: 0,
      ubicacion: '', estado: 'activo', fechaCreacion: new Date().toISOString(), ultimaActualizacion: new Date().toISOString()
    });
    setModalActivo('agregar');
  };

  const abrirModalEditar = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setProductoForm(producto);
    setModalActivo('editar');
  };

  const cerrarModal = () => {
    setModalActivo(null);
    setProductoSeleccionado(null);
    setProductoForm({});
  };

  const guardarProducto = async () => {
    if (!productoForm.nombre || !productoForm.proveedor || !productoForm.categoria) {
      alert('Completa nombre, proveedor y categoría');
      return;
    }

    const baseProducto = {
      nombre: productoForm.nombre as string,
      codigoBarras: productoForm.codigoBarras || '',
      categoria: productoForm.categoria as string,
      proveedor: productoForm.proveedor as string,
      ubicacion: productoForm.ubicacion || '',
      imagen: productoForm.imagen || '',
      descripcion: productoForm.descripcion || '',
      estado: productoForm.estado || 'activo',
      stockMinimo: Number(productoForm.stockMinimo || 0),
      precioCompra: Number(productoForm.precioCompra || 0),
      precioVenta: Number(productoForm.precioVenta || 0),
      margen: Number(productoForm.margen || 0),
      cantidad: Number(productoForm.stock || 0),
      precio: Number(productoForm.precioVenta || 0),
      fechaCreacion: productoForm.fechaCreacion ?? new Date().toISOString(),
      ultimaActualizacion: new Date().toISOString()
    };

    try {
      if (modalActivo === 'agregar') {
        const response = await fetch('/api/tienda/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(baseProducto)
        });

        if (!response.ok) {
          throw new Error('No se pudo crear el producto en el servidor.');
        }

        const creado = await response.json();
        const nuevoProducto = mapApiProductoToProducto(creado);
        setProductos(prev => [...prev, nuevoProducto]);
      } else if (modalActivo === 'editar' && productoSeleccionado) {
        const response = await fetch(`/api/tienda/productos/${productoSeleccionado.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(baseProducto)
        });

        if (!response.ok) {
          throw new Error('No se pudo actualizar el producto en el servidor.');
        }

        const actualizado = await response.json();
        const productoActualizado = mapApiProductoToProducto(actualizado);
        setProductos(prev => prev.map(p => (p.id === productoSeleccionado.id ? productoActualizado : p)));
        setProductoSeleccionado(productoActualizado);
      }

      setProductoForm({});
      cerrarModal();
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error guardando producto. Revisa la consola del navegador.');
    }
  };

  // Utilitarios para mapear los datos de la API al modelo local
  const mapApiProductoToProducto = (p: any): Producto => {
    const stock = p.stock ?? p.cantidad ?? 0;
    const precioVenta = p.precioVenta ?? p.precio ?? 0;
    const precioCompra = p.precioCompra ?? p.precio ?? 0;

    return {
      id: p.id ?? p._id ?? Date.now(),
      nombre: p.nombre ?? '',
      codigoBarras: p.codigoBarras ?? '',
      categoria: p.categoria ?? 'Sin Categoría',
      stock: Number(stock),
      stockMinimo: Number(p.stockMinimo ?? 5),
      precioCompra: Number(precioCompra),
      precioVenta: Number(precioVenta),
      margen: Number(p.margen ?? ((precioVenta && precioCompra) ? ((precioVenta - precioCompra) / (precioCompra || 1) * 100) : 0)),
      proveedor: p.proveedor ?? '',
      proveedorId: Number(p.proveedorId ?? 0),
      fechaVencimiento: p.fechaVencimiento ? new Date(p.fechaVencimiento).toISOString() : undefined,
      ubicacion: p.ubicacion ?? 'Por Definir',
      imagen: p.imagen ?? '',
      descripcion: p.descripcion ?? '',
      estado: p.estado ?? 'activo',
      fechaCreacion: p.fechaCreacion ? new Date(p.fechaCreacion).toISOString() : new Date().toISOString(),
      ultimaActualizacion: p.ultimaActualizacion ? new Date(p.ultimaActualizacion).toISOString() : new Date().toISOString()
    };
  };

  const cargarProductosDelServidor = async () => {
    try {
      const respuesta = await fetch('/api/tienda/productos');
      if (!respuesta.ok) throw new Error('No se pudo cargar productos');
      const datos = await respuesta.json();
      setProductos(datos.map((p: any) => mapApiProductoToProducto(p)));
    } catch (error) {
      console.warn('Error al cargar productos desde API, conservando demo local:', error);
      // Se mantiene el demo local con datos precargados (queda de respaldo)
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
    }
  };

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
    cargarProductosDelServidor();
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
    productosAgotados: productos.filter(p => (p.stock ?? 0) <= (p.stockMinimo ?? 0)).length,
    valorInventario: productos.reduce((total, p) => total + ((p.stock ?? 0) * (p.precioVenta ?? 0)), 0),
    margenPromedio: productos.length > 0 ? productos.reduce((total, p) => total + (p.margen ?? 0), 0) / productos.length : 0
  };

  const manejarEscaneo = (codigo: string) => {
    console.log('🔍 Código escaneado en inventario:', codigo);
    // El escáner ya procesó el producto automáticamente
  };

  const manejarProductoEncontrado = (producto: Producto) => {
    console.log('✅ Producto procesado:', producto);
    setProductoSeleccionado(producto);
    setProductoForm(producto);
    setModalActivo('editar');
    setEscanerActivo(false);
  };

  const manejarProductoNoEncontrado = (codigo: string) => {
    console.log('❓ Producto no encontrado:', codigo);
    // Abrir modal para crear nuevo producto y completar el código de barras
    setProductoForm({
      codigoBarras: codigo,
      nombre: `Nuevo producto ${codigo.slice(-6)}`,
      categoria: 'Sin Categoría',
      proveedor: '',
      stock: 0,
      stockMinimo: 5,
      precioCompra: 0,
      precioVenta: 0,
      margen: 0,
      ubicacion: 'Por Definir',
      estado: 'activo'
    });
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
                id="filtro-categoria"
                aria-label="Filtrar por categoría"
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
                id="filtro-proveedor"
                aria-label="Filtrar por proveedor"
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
                id="filtro-estado"
                aria-label="Filtrar por estado"
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
                onClick={abrirModalAgregar}
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
                onEdit={() => abrirModalEditar(producto)}
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

          {/* Modal de agregar/editar */}
          {modalActivo && modalActivo !== 'proveedor' && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>{modalActivo === 'agregar' ? '➕ Agregar producto' : '✏️ Editar producto'}</h2>
                <div className="modal-form">
                  <label htmlFor="nombre-producto">Nombre del Producto</label>
                  <input
                    id="nombre-producto"
                    placeholder="Ej: Arroz Diana Premium 500g"
                    value={productoForm.nombre || ''}
                    onChange={(e) => setProductoForm({...productoForm, nombre: e.target.value})}
                  />

                  <label htmlFor="codigo-barras">Código de Barras</label>
                  <input
                    id="codigo-barras"
                    placeholder="7701234567890"
                    value={productoForm.codigoBarras || ''}
                    onChange={(e) => setProductoForm({...productoForm, codigoBarras: e.target.value})}
                  />

                  <label htmlFor="categoria-producto">Categoría</label>
                  <input
                    id="categoria-producto"
                    placeholder="Ej: Granos, Lácteos, Bebidas..."
                    value={productoForm.categoria || ''}
                    onChange={(e) => setProductoForm({...productoForm, categoria: e.target.value})}
                  />

                  <label htmlFor="proveedor-producto">Proveedor</label>
                  <input
                    id="proveedor-producto"
                    placeholder="Nombre del proveedor"
                    value={productoForm.proveedor || ''}
                    onChange={(e) => setProductoForm({...productoForm, proveedor: e.target.value})}
                  />

                  <label htmlFor="stock-producto">Stock Actual</label>
                  <input
                    id="stock-producto"
                    type="number"
                    placeholder="0"
                    min="0"
                    value={productoForm.stock ?? 0}
                    onChange={(e) => setProductoForm({...productoForm, stock: Number(e.target.value)})}
                  />

                  <label htmlFor="precio-compra">Precio de Compra</label>
                  <input
                    id="precio-compra"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={productoForm.precioCompra ?? 0}
                    onChange={(e) => setProductoForm({...productoForm, precioCompra: Number(e.target.value)})}
                  />

                  <label htmlFor="precio-venta">Precio de Venta</label>
                  <input
                    id="precio-venta"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={productoForm.precioVenta ?? 0}
                    onChange={(e) => setProductoForm({...productoForm, precioVenta: Number(e.target.value)})}
                  />

                  <label htmlFor="estado-producto">Estado del Producto</label>
                  <select
                    id="estado-producto"
                    value={productoForm.estado || 'activo'}
                    onChange={(e) => setProductoForm({...productoForm, estado: e.target.value as Producto['estado']})}
                  >
                    <option value="activo">Activo</option>
                    <option value="agotado">Agotado</option>
                    <option value="descontinuado">Descontinuado</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button className="btn-save" onClick={guardarProducto}>Guardar</button>
                  <button className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
                </div>
              </div>
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
  const stock = producto.stock ?? 0;
  const stockMinimo = producto.stockMinimo ?? 0;
  const stockStatus = stock <= stockMinimo ? 'danger' : 
                     stock <= stockMinimo * 2 ? 'warning' : 'good';

  return (
    <div className={`product-card ${producto.estado}`} onDoubleClick={onEdit} style={{ cursor: 'pointer' }}>
      <div className="product-image">
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre} />
        ) : (
          <div className="image-placeholder">📦</div>
        )}
        <span className={`stock-badge ${stockStatus}`}>
          {stock} und
        </span>
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{producto.nombre}</h3>
        <p className="product-category">{producto.categoria}</p>
        <div className="product-code">{producto.codigoBarras}</div>
        
        <div className="product-pricing">
          <div className="price-row">
            <span>Compra: ${(producto.precioCompra || 0).toLocaleString()}</span>
            <span>Venta: ${(producto.precioVenta || 0).toLocaleString()}</span>
          </div>
          <div className="margin-info">
            Margen: <strong>{(producto.margen || 0).toFixed(1)}%</strong>
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