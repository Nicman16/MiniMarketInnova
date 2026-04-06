// src/componentes/PuntoVenta.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Producto, ItemVenta } from '../types/pos.types';
import EscanerZXing from './EscanerZXing';
import '../styles/PuntoVenta.css';

function PuntoVenta() {
  // Estados
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [escanerActivo, setEscanerActivo] = useState(false);

  // Datos de productos para la venta
  const productos: Producto[] = [
    {
      id: 1,
      nombre: 'Arroz Diana Premium 500g',
      codigoBarras: '7702001001234',
      categoria: 'Granos y Cereales',
      precio: 2500,
      stock: 45,
      imagen: 'https://via.placeholder.com/150x100/667eea/white?text=ARROZ'
    },
    {
      id: 2,
      nombre: 'Aceite Gourmet 1L',
      codigoBarras: '7702002001235',
      categoria: 'Aceites',
      precio: 4500,
      stock: 28,
      imagen: 'https://via.placeholder.com/150x100/28a745/white?text=ACEITE'
    },
    {
      id: 3,
      nombre: 'Azúcar Incauca 1kg',
      codigoBarras: '7702003001236',
      categoria: 'Endulzantes',
      precio: 3200,
      stock: 8,
      imagen: 'https://via.placeholder.com/150x100/ffc107/white?text=AZUCAR'
    },
    {
      id: 4,
      nombre: 'Coca Cola 2L',
      codigoBarras: '7894900011517',
      categoria: 'Bebidas',
      precio: 4000,
      stock: 15,
      imagen: 'https://via.placeholder.com/150x100/dc3545/white?text=COCA+COLA'
    },
    {
      id: 5,
      nombre: 'Leche Alpina 1L',
      codigoBarras: '7891000100103',
      categoria: 'Lácteos',
      precio: 3000,
      stock: 12,
      imagen: 'https://via.placeholder.com/150x100/007bff/white?text=LECHE'
    },
    {
      id: 6,
      nombre: 'Pan Bimbo Grande',
      codigoBarras: '7702001234567',
      categoria: 'Panadería',
      precio: 2200,
      stock: 6,
      imagen: 'https://via.placeholder.com/150x100/ffc107/white?text=PAN'
    }
  ];

  // Enriquecer productos con datos de inventario
  const productosEnriquecidos: Producto[] = productos.map(p => ({
    ...p,
    stock: p.stock || 0,
    stockMinimo: p.stock ? 5 : 0,
    precioCompra: p.precio ? Math.round(p.precio * 0.7) : 0,
    precioVenta: p.precio,
    margen: 30,
    proveedor: p.proveedor || 'Distribuidora Central',
    proveedorId: p.proveedorId || 1,
    ubicacion: p.ubicacion || 'Pasillo A',
    descripcion: p.descripcion || `Producto ${p.nombre}`,
    estado: p.estado || ('activo' as const),
    fechaCreacion: p.fechaCreacion || new Date().toISOString(),
    ultimaActualizacion: p.ultimaActualizacion || new Date().toISOString()
  }));

  // Filtrar productos
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    
    return productos.filter(producto =>
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.categoria.toLowerCase().includes(busqueda.toLowerCase()) ||
      (producto.codigoBarras && producto.codigoBarras.includes(busqueda))
    );
  }, [busqueda, productos]);

  // Función para agregar al carrito
  const agregarAlCarrito = useCallback((producto: Producto) => {
    setCarrito(carritoActual => {
      const itemExistente = carritoActual.find(item => item.producto.id === producto.id);

      if (itemExistente) {
        return carritoActual.map(item =>
          item.producto.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precioUnitario
              }
            : item
        );
      }

      const nuevoItem: ItemVenta = {
        id: Number(producto.id),
        producto: producto,
        precioUnitario: producto.precio || 0,
        cantidad: 1,
        subtotal: producto.precio || 0
      };

      return [...carritoActual, nuevoItem];
    });
  }, []);

  // Función única para manejar códigos escaneados
  const manejarCodigoEscaneado = useCallback((codigo: string) => {
    console.log('🔍 Código escaneado:', codigo);
    
    // Buscar producto por código de barras
    const producto = productos.find(p => p.codigoBarras === codigo);
    
    if (producto) {
      agregarAlCarrito(producto);
      console.log('✅ Producto agregado:', producto.nombre);
      
      // Vibración en móviles
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Cerrar escáner después de agregar
      setEscanerActivo(false);
    } else {
      console.log('❌ Producto no encontrado para código:', codigo);
      
      // Preguntar si desea agregarlo manualmente
      const agregarManual = window.confirm(
        `Producto no encontrado para el código: ${codigo}\n\n¿Deseas agregarlo manualmente?`
      );
      
      if (agregarManual) {
        const nombre = prompt('Nombre del producto:');
        const precio = prompt('Precio de venta:');
        
        if (nombre && precio) {
          const precioNumerico = parseFloat(precio);
          if (!isNaN(precioNumerico)) {
            const productoManual: Producto = {
              id: Date.now(),
              nombre: nombre.trim(),
              codigoBarras: codigo,
              categoria: 'Sin Categoría',
              precio: precioNumerico
            };
            
            agregarAlCarrito(productoManual);
            console.log('✅ Producto manual agregado:', nombre);
          }
        }
      }
      
      setEscanerActivo(false);
    }
  }, [productos, agregarAlCarrito]);

  // Callbacks para el escáner
  const manejarProductoEncontrado = useCallback((producto: Producto) => {
    console.log('✅ Producto identificado por escáner:', producto.nombre);

    // Crear item de venta desde el producto
    const itemVenta: ItemVenta = {
      id: Number(producto.id),
      producto: producto,
      precioUnitario: producto.precioVenta || producto.precio || 0,
      cantidad: 1,
      subtotal: producto.precioVenta || producto.precio || 0
    };

    agregarAlCarrito(producto);
    setEscanerActivo(false);
  }, [agregarAlCarrito]);

  const manejarProductoNoEncontrado = useCallback((codigo: string) => {
    console.log('❓ Código no encontrado en base de datos:', codigo);
    manejarCodigoEscaneado(codigo);
  }, [manejarCodigoEscaneado]);

  // Función para remover del carrito
  const removerDelCarrito = useCallback((id: number) => {
    setCarrito(carritoActual => carritoActual.filter(item => item.id !== id));
  }, []);

  // Función para actualizar cantidad
  const actualizarCantidad = useCallback((id: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      removerDelCarrito(id);
      return;
    }

    setCarrito(carritoActual =>
      carritoActual.map(item =>
        item.id === id
          ? {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * item.precioUnitario
            }
          : item
      )
    );
  }, [removerDelCarrito]);

  // Calcular totales
  const calcularTotales = useMemo(() => {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = subtotal * 0.19;
    const total = subtotal + iva;
    
    return { subtotal, iva, total };
  }, [carrito]);

  // Limpiar carrito
  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
  }, []);

  // Procesar venta
  const procesarVenta = useCallback(() => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    
    const confirmacion = window.confirm(
      `¿Confirmar venta por $${calcularTotales.total.toLocaleString()}?`
    );
    
    if (confirmacion) {
      console.log('🛒 Venta procesada:', {
        items: carrito,
        totales: calcularTotales,
        fecha: new Date().toISOString()
      });
      
      alert('¡Venta procesada exitosamente!');
      limpiarCarrito();
    }
  }, [carrito, calcularTotales, limpiarCarrito]);

  return (
    <div className="pos-container">
      <div className="pos-header">
        <h1>🛒 Punto de Venta</h1>
        <div className="pos-stats">
          <span>Items: {carrito.length}</span>
          <span>Total: ${calcularTotales.total.toLocaleString()}</span>
        </div>
      </div>

      <div className="pos-layout">
        {/* Panel de Productos */}
        <div className="productos-panel">
          <div className="busqueda-container">
            <input
              type="text"
              placeholder="🔍 Buscar producto o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input"
            />
            <button 
              className={`button ${escanerActivo ? 'danger' : 'primary'}`}
              onClick={() => setEscanerActivo(!escanerActivo)}
            >
              {escanerActivo ? '❌ Cerrar' : '📱 Escanear'}
            </button>
          </div>

          {escanerActivo && (
            <div className="escaner-wrapper">
              <EscanerZXing 
                onScan={manejarCodigoEscaneado}
                onProductoEncontrado={manejarProductoEncontrado}
                onProductoNoEncontrado={manejarProductoNoEncontrado}
                productos={productosEnriquecidos}
                isActive={escanerActivo}
              />
            </div>
          )}

          <div className="productos-grid">
            {productosFiltrados.map(producto => (
              <div 
                key={producto.id} 
                className="producto-card"
                onClick={() => agregarAlCarrito(producto)}
              >
                <div className="producto-imagen">
                  <img src={producto.imagen} alt={producto.nombre} />
                  <span className="precio">${(producto.precio || 0).toLocaleString()}</span>
                </div>
                <div className="producto-info">
                  <h4>{producto.nombre}</h4>
                  <p>{producto.categoria}</p>
                  <span className="codigo">{producto.codigoBarras?.slice(-6) || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel del Carrito */}
        <div className="carrito-panel">
          <div className="carrito-header">
            <h3>🛒 Carrito de Compras</h3>
            <button 
              className="button danger small"
              onClick={limpiarCarrito}
              disabled={carrito.length === 0}
            >
              🗑️ Limpiar
            </button>
          </div>

          <div className="carrito-items">
            {carrito.length === 0 ? (
              <div className="carrito-vacio">
                <p>🛒 Carrito vacío</p>
                <small>Agrega productos para comenzar</small>
              </div>
            ) : (
              carrito.map(item => (
                <div key={item.id} className="carrito-item">
                  <div className="item-info">
                    <h5>{item.producto.nombre}</h5>
                    <p>${item.precioUnitario.toLocaleString()} c/u</p>
                  </div>

                  <div className="item-controles">
                    <button
                      className="button small"
                      onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                    >
                      -
                    </button>
                    <span className="cantidad">{item.cantidad}</span>
                    <button
                      className="button small"
                      onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="item-subtotal">
                    ${item.subtotal.toLocaleString()}
                  </div>

                  <button
                    className="button danger small"
                    onClick={() => removerDelCarrito(item.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          {carrito.length > 0 && (
            <div className="carrito-totales">
              <div className="total-line">
                <span>Subtotal:</span>
                <span>${calcularTotales.subtotal.toLocaleString()}</span>
              </div>
              <div className="total-line">
                <span>IVA (19%):</span>
                <span>${calcularTotales.iva.toLocaleString()}</span>
              </div>
              <div className="total-line total">
                <span>Total:</span>
                <span>${calcularTotales.total.toLocaleString()}</span>
              </div>
              
              <button 
                className="button success large"
                onClick={procesarVenta}
              >
                💳 Procesar Venta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PuntoVenta;