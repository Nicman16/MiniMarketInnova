// src/componentes/Inventario.tsx - Sistema completo
import React, { useState, useEffect } from 'react';
import {
  Barcode,
  Box,
  Boxes,
  Building2,
  ChartNoAxesColumn,
  CircleCheckBig,
  CirclePlus,
  Search,
  TriangleAlert,
  Wallet,
  QrCode
} from 'lucide-react';
import '../../styles/Inventario.css';
import { Producto } from '../../types/pos.types';
import EscanerZXing from './EscanerZXing';
import EstadisticasAvanzadas from '../dashboard/EstadisticasAvanzadas';
import { inventarioFirestoreService } from '../../services/inventario/inventarioFirestoreService';

interface Proveedor {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  productos: number[];
}

interface ProductoRegistroForm {
  nombre: string;
  codigoBarras: string;
  stock: number;
  precioPorKilo: number;
  fechaVencimiento: string;
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
  const [productoForm, setProductoForm] = useState<ProductoRegistroForm>({
    nombre: '',
    codigoBarras: '',
    stock: 0,
    precioPorKilo: 0,
    fechaVencimiento: ''
  });
  const [errorCargaProductos, setErrorCargaProductos] = useState('');
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);
  const [soloProximosVencer, setSoloProximosVencer] = useState(false);

  const abrirModalAgregar = () => {
    setProductoSeleccionado(null);
    setProductoForm({
      nombre: '',
      codigoBarras: '',
      stock: 0,
      precioPorKilo: 0,
      fechaVencimiento: ''
    });
    setModalActivo('agregar');
  };

  const abrirModalEditar = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setProductoForm({
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras,
      stock: Number(producto.stock ?? 0),
      precioPorKilo: Number(producto.precioCompra ?? 0),
      fechaVencimiento: producto.fechaVencimiento ? producto.fechaVencimiento.slice(0, 10) : ''
    });
    setModalActivo('editar');
  };

  const cerrarModal = () => {
    setModalActivo(null);
    setProductoSeleccionado(null);
    setProductoForm({
      nombre: '',
      codigoBarras: '',
      stock: 0,
      precioPorKilo: 0,
      fechaVencimiento: ''
    });
  };

  const guardarProducto = async () => {
    if (!productoForm.nombre || !productoForm.codigoBarras || !productoForm.fechaVencimiento) {
      setMensajeGuardado('Completa nombre, código de barras y fecha de vencimiento.');
      return;
    }

    try {
      const guardado = await inventarioFirestoreService.guardarProducto({
        nombre: productoForm.nombre,
        codigoBarras: productoForm.codigoBarras,
        stock: Number(productoForm.stock || 0),
        precioPorKilo: Number(productoForm.precioPorKilo || 0),
        fechaVencimiento: productoForm.fechaVencimiento
      });

      setProductos(prev => {
        const existe = prev.some((producto) => producto.codigoBarras === guardado.codigoBarras);
        if (existe) {
          return prev.map((producto) =>
            producto.codigoBarras === guardado.codigoBarras ? guardado : producto
          );
        }
        return [...prev, guardado];
      });

      setMensajeGuardado('Producto guardado exitosamente en Firestore.');
      setTimeout(() => {
        setMensajeGuardado(null);
        cerrarModal();
      }, 1200);
    } catch (error) {
      console.error('Error guardando producto:', error);
      setMensajeGuardado('Error guardando producto en Firestore.');
    }
  };

  const cargarProductosDelServidor = async () => {
    try {
      const datos = await inventarioFirestoreService.listarProductos();
      setProductos(datos);
      setErrorCargaProductos('');
    } catch (error) {
      console.warn('Error al cargar productos desde Firestore:', error);
      setProductos([]);
      setErrorCargaProductos('No fue posible cargar productos desde Firestore en este momento.');
    }
  };

  useEffect(() => {
    cargarProductosDelServidor();
  }, []);

  useEffect(() => {
    const proveedoresMap = new Map<string, Proveedor>();

    productos.forEach((producto, index) => {
      const nombreProveedor = (producto.proveedor || '').trim();
      if (!nombreProveedor) return;

      const productoId = Number(producto.id);
      const normalizedProductoId = Number.isFinite(productoId) ? productoId : index + 1;

      const existing = proveedoresMap.get(nombreProveedor);
      if (existing) {
        existing.productos.push(normalizedProductoId);
        return;
      }

      proveedoresMap.set(nombreProveedor, {
        id: index + 1,
        nombre: nombreProveedor,
        contacto: 'Sin contacto registrado',
        telefono: 'Sin teléfono',
        email: 'Sin correo',
        direccion: 'Sin dirección',
        productos: [normalizedProductoId]
      });
    });

    setProveedores(Array.from(proveedoresMap.values()));
  }, [productos]);

  const calcularDiasParaVencer = (fechaVencimiento?: string): number | null => {
    if (!fechaVencimiento) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vencimiento = new Date(fechaVencimiento);
    if (Number.isNaN(vencimiento.getTime())) return null;
    vencimiento.setHours(0, 0, 0, 0);

    const diffMs = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const coincideBusqueda = producto.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
                            producto.codigoBarras.includes(filtros.busqueda);
    const coincideCategoria = !filtros.categoria || producto.categoria === filtros.categoria;
    const coincideProveedor = !filtros.proveedor || producto.proveedor === filtros.proveedor;
    const coincideEstado = filtros.estado === 'todos' || producto.estado === filtros.estado;
    const coincideVencimiento = !soloProximosVencer || (() => {
      const dias = calcularDiasParaVencer(producto.fechaVencimiento);
      return dias !== null && dias >= 0 && dias <= 20;
    })();
    
    return coincideBusqueda && coincideCategoria && coincideProveedor && coincideEstado && coincideVencimiento;
  });

  const proximosVencerCount = productos.filter((producto) => {
    const dias = calcularDiasParaVencer(producto.fechaVencimiento);
    return dias !== null && dias >= 0 && dias <= 20;
  }).length;

  const productosConAlertaOperativa = productosFiltrados.filter((producto) => {
    const dias = calcularDiasParaVencer(producto.fechaVencimiento);
    return dias !== null && dias >= 6 && dias <= 20;
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

  const manejarEscaneo = async (codigo: string) => {
    console.log('🔍 Código escaneado en inventario:', codigo);
    const codigoNormalizado = codigo.trim();
    if (!codigoNormalizado) return;

    try {
      const producto = await inventarioFirestoreService.existeProductoPorCodigo(codigoNormalizado);

      if (producto) {
        setProductoSeleccionado(producto);
        abrirModalEditar(producto);
      } else {
        setProductoSeleccionado(null);
        setProductoForm({
          nombre: '',
          codigoBarras: codigoNormalizado,
          stock: 0,
          precioPorKilo: 0,
          fechaVencimiento: ''
        });
        setModalActivo('agregar');
      }
    } catch (error) {
      console.error('Error verificando producto en Firestore:', error);
      setMensajeGuardado('No se pudo verificar el producto en Firestore.');
    } finally {
      setEscanerActivo(false);
    }
  };

  const manejarProductoEncontrado = (producto: Producto) => {
    console.log('✅ Producto detectado por escáner:', producto.nombre);
  };

  const manejarProductoNoEncontrado = (codigo: string) => {
    console.log('❓ Producto no encontrado por escáner:', codigo);
  };

  return (
    <div className="inventario-container">
      {/* Header con navegación */}
      <header className="inventario-header">
        <div className="header-title">
          <h1><Boxes size={28} /> Sistema de Inventario</h1>
          <p>Gestión completa de productos y proveedores</p>
        </div>
        
        <nav className="inventario-nav">
          <button 
            className={`nav-btn ${vistaActual === 'productos' ? 'active' : ''}`}
            onClick={() => setVistaActual('productos')}
          >
            <Box size={16} /> Productos
          </button>
          <button 
            className={`nav-btn ${vistaActual === 'proveedores' ? 'active' : ''}`}
            onClick={() => setVistaActual('proveedores')}
          >
            <Building2 size={16} /> Proveedores
          </button>
          <button 
            className={`nav-btn ${vistaActual === 'estadisticas' ? 'active' : ''}`}
            onClick={() => setVistaActual('estadisticas')}
          >
            <ChartNoAxesColumn size={16} /> Estadísticas
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
                  placeholder="Buscar por nombre o código..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                  className="search-input"
                />
                <Search size={16} className="search-input-icon" />
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
                className={`btn-vencimiento ${soloProximosVencer ? 'active' : ''}`}
                onClick={() => setSoloProximosVencer((v) => !v)}
              >
                <TriangleAlert size={16} /> {soloProximosVencer ? 'Ver todos' : `Solo próximos a vencer (${proximosVencerCount})`}
              </button>
              <button 
                className="btn-scanner"
                onClick={() => setEscanerActivo(!escanerActivo)}
              >
                {escanerActivo ? <><TriangleAlert size={16} /> Cerrar Escáner</> : <><QrCode size={16} /><Barcode size={16} /> Escáner QR y Barras</>}
              </button>
              <button 
                className="btn-add"
                onClick={abrirModalAgregar}
              >
                <CirclePlus size={16} /> Nuevo Producto
              </button>
            </div>
          </div>

          {/* Escáner */}
          {escanerActivo && (
            <div className="scanner-container">
              <div className="scanner-intro">
                <h3><QrCode size={18} /> Escáner inteligente</h3>
                <p>Compatible con códigos de barras y QR, estilo app móvil: detecta, vibra y autocompleta.</p>
              </div>
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
              <div className="stat-icon"><Box size={22} /></div>
              <div className="stat-info">
                <span className="stat-number">{estadisticas.totalProductos}</span>
                <span className="stat-label">Total Productos</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><CircleCheckBig size={22} /></div>
              <div className="stat-info">
                <span className="stat-number">{estadisticas.productosActivos}</span>
                <span className="stat-label">Activos</span>
              </div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon"><TriangleAlert size={22} /></div>
              <div className="stat-info">
                <span className="stat-number">{estadisticas.productosAgotados}</span>
                <span className="stat-label">Stock Bajo</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Wallet size={22} /></div>
              <div className="stat-info">
                <span className="stat-number">${estadisticas.valorInventario.toLocaleString()}</span>
                <span className="stat-label">Valor Total</span>
              </div>
            </div>
          </div>

          {/* Lista de productos */}
          {productosConAlertaOperativa.length > 0 && (
            <div className="inventario-alerta-operativa" role="status" aria-live="polite">
              ⚠️ Por favor, organizar los productos en orden de fecha de vencimiento.
            </div>
          )}

          <div className="productos-grid">
            {productosFiltrados.map(producto => (
              <ProductCard 
                key={producto.id} 
                producto={producto}
                diasParaVencer={calcularDiasParaVencer(producto.fechaVencimiento)}
                onEdit={() => abrirModalEditar(producto)}
              />
            ))}
          </div>

          {productosFiltrados.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No se encontraron productos</h3>
              <p>{errorCargaProductos || 'Ajusta los filtros o agrega nuevos productos'}</p>
            </div>
          )}

          {/* Modal de agregar/editar */}
          {(modalActivo === 'agregar' || modalActivo === 'editar') && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>{modalActivo === 'agregar' ? '➕ Agregar producto' : '✏️ Editar producto'}</h2>
                <div className="modal-form">
                  <label htmlFor="nombre-producto">Nombre del Producto</label>
                  <input
                    id="nombre-producto"
                    placeholder="Ej: Arroz Premium"
                    value={productoForm.nombre}
                    onChange={(e) => setProductoForm({...productoForm, nombre: e.target.value})}
                  />

                  <label htmlFor="codigo-barras">Código de Barras</label>
                  <div className="barcode-input-group">
                    <input
                      id="codigo-barras"
                      placeholder="7701234567890"
                      value={productoForm.codigoBarras}
                      onChange={(e) => setProductoForm({...productoForm, codigoBarras: e.target.value})}
                      className="barcode-input"
                    />
                    <button
                      type="button"
                      className="btn-barcode-gen"
                      title="Generar código aleatorio"
                      onClick={() => {
                        const random = () => Math.floor(Math.random() * 10).toString();
                        let code = '77';
                        for (let i = 0; i < 11; i++) code += random();
                        setProductoForm({ ...productoForm, codigoBarras: code });
                      }}
                    >
                      <Barcode size={18} />
                    </button>
                  </div>

                  <label htmlFor="stock-producto">Stock Actual</label>
                  <input
                    id="stock-producto"
                    type="number"
                    placeholder="0"
                    min="0"
                    value={productoForm.stock}
                    onChange={(e) => setProductoForm({...productoForm, stock: Number(e.target.value)})}
                  />

                  <label htmlFor="precio-kilo">Precio por Kilo</label>
                  <input
                    id="precio-kilo"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={productoForm.precioPorKilo}
                    onChange={(e) => setProductoForm({...productoForm, precioPorKilo: Number(e.target.value)})}
                  />

                  <label htmlFor="fecha-vencimiento">Fecha de Vencimiento</label>
                  <input
                    id="fecha-vencimiento"
                    type="date"
                    value={productoForm.fechaVencimiento}
                    onChange={e => setProductoForm({...productoForm, fechaVencimiento: e.target.value})}
                  />
                </div>

                <div className="modal-actions">
                  <button className="btn-save" onClick={guardarProducto}>Guardar</button>
                  <button className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
                </div>
                {mensajeGuardado && (
                  <div className="modal-feedback">{mensajeGuardado}</div>
                )}
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
const ProductCard: React.FC<{producto: Producto, onEdit: () => void, diasParaVencer?: number | null}> = ({producto, onEdit, diasParaVencer = null}) => {
  const stock = producto.stock ?? 0;
  const stockMinimo = producto.stockMinimo ?? 0;
  const stockStatus = stock <= stockMinimo ? 'danger' : 
                     stock <= stockMinimo * 2 ? 'warning' : 'good';
  const vencimientoCritico = diasParaVencer !== null && diasParaVencer <= 5;
  const vencimientoOperativo = diasParaVencer !== null && diasParaVencer >= 6 && diasParaVencer <= 20;

  return (
    <div className={`product-card ${producto.estado} ${vencimientoCritico ? 'vencimiento-critico' : ''} ${vencimientoOperativo ? 'vencimiento-operativo' : ''} pointer-card`} onDoubleClick={onEdit}>
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
          {vencimientoCritico && (
            <div className="detail-item vencimiento-chip critico">
              <span className="detail-icon">🔴</span>
              <span>
                {diasParaVencer !== null && diasParaVencer >= 0
                  ? `Alerta crítica: ${diasParaVencer} día(s) para vencer`
                  : 'Alerta crítica: producto vencido'}
              </span>
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