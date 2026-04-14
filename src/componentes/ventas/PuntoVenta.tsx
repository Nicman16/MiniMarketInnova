// src/componentes/PuntoVenta.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Producto, ItemVenta } from '../../types/pos.types';
import { productoService } from '../../services/inventario/productoService';
import { ventaService } from '../../services/ventas/ventaService';
import { useAuth } from '../../context/AuthContext';
import EscanerZXing from '../inventario/EscanerZXing';
import '../../styles/PuntoVenta.css';

function PuntoVenta() {
  // Estados
  const { usuario } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [escanerActivo, setEscanerActivo] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  const cargarProductos = useCallback(async () => {
    try {
      setCargando(true);
      const datos = await productoService.obtenerProductos();
      setProductos(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar productos');
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  // Cargar productos al montar
  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Obtener categorías únicas
  const categorias = useMemo(() => {
    const cats = new Set(productos.map(p => p.categoria).filter(Boolean));
    return ['todos', ...Array.from(cats)];
  }, [productos]);

  // Filtrar productos por búsqueda y categoría
  const productosFiltrados = useMemo(() => {
    let resultado = productos;

    if (categoriaSeleccionada !== 'todos') {
      resultado = resultado.filter(p => p.categoria === categoriaSeleccionada);
    }

    if (busqueda.trim()) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(search) ||
        p.categoria?.toLowerCase().includes(search) ||
        p.codigoBarras?.includes(search)
      );
    }

    return resultado;
  }, [productos, busqueda, categoriaSeleccionada]);

  // Función para agregar al carrito
  const agregarAlCarrito = useCallback((producto: Producto) => {
    setCarrito(carritoActual => {
      const itemExistente = carritoActual.find(item => item.id === producto.id);

      if (itemExistente) {
        return carritoActual.map(item =>
          item.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precioUnitario
              }
            : item
        );
      }

      const nuevoItem: ItemVenta = {
        id: producto.id,
        producto: producto,
        precioUnitario: producto.precioVenta ?? producto.precio ?? 0,
        cantidad: 1,
        subtotal: producto.precioVenta ?? producto.precio ?? 0
      };

      return [...carritoActual, nuevoItem];
    });
  }, []);

  // Función para remover del carrito
  const removerDelCarrito = useCallback((id: number | string) => {
    setCarrito(carritoActual => carritoActual.filter(item => item.id !== id));
  }, []);

  // Función para actualizar cantidad
  const actualizarCantidad = useCallback((id: number | string, nuevaCantidad: number) => {
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
    const descuentoAplicado = subtotal * (descuento / 100);
    const subtotalConDescuento = subtotal - descuentoAplicado;
    const iva = subtotalConDescuento * 0.19;
    const total = subtotalConDescuento + iva;
    
    return { subtotal, descuentoAplicado, subtotalConDescuento, iva, total };
  }, [carrito, descuento]);

  // Limpiar carrito
  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    setDescuento(0);
    setMetodoPago('efectivo');
  }, []);

  // Manejar código escaneado
  const manejarCodigoEscaneado = useCallback((codigo: string) => {
    console.log('🔍 Código escaneado:', codigo);
    
    const producto = productos.find(p => p.codigoBarras === codigo);
    
    if (producto) {
      agregarAlCarrito(producto);
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      setEscanerActivo(false);
    } else {
      console.log('❌ Producto no encontrado para código:', codigo);
    }
  }, [productos, agregarAlCarrito]);

  // Procesar venta
  const procesarVenta = useCallback(async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (!usuario) {
      alert('Debe iniciar sesión para registrar una venta');
      return;
    }
    
    const confirmacion = window.confirm(
      `¿Confirmar venta por $${calcularTotales.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}?`
    );
    
    if (confirmacion) {
      try {
        setProcesandoVenta(true);

        await ventaService.registrarVenta({
          items: carrito,
          subtotal: calcularTotales.subtotal,
          iva: calcularTotales.iva,
          descuentos: calcularTotales.descuentoAplicado,
          total: calcularTotales.total,
          metodoPago
        });

        await cargarProductos();
        alert('¡Venta procesada exitosamente!');
        limpiarCarrito();
      } catch (ventaError) {
        alert(ventaError instanceof Error ? ventaError.message : 'No se pudo registrar la venta');
        console.error(ventaError);
      } finally {
        setProcesandoVenta(false);
      }
    }
  }, [calcularTotales, carrito, cargarProductos, limpiarCarrito, metodoPago, usuario]);

  if (cargando) {
    return (
      <div className="pos-container">
        <div className="pos-header">
          <h1>🛒 Punto de Venta</h1>
        </div>
        <div className="loading-state">
          Cargando productos...
        </div>
      </div>
    );
  }

  return (
    <div className="pos-container">
      {/* HEADER */}
      <div className="pos-header">
        <h1>🛒 Punto de Venta</h1>
        <div className="sesion-info">
          <span>👤 {usuario?.nombre}</span>
          <span>📦 {productos.length} productos</span>
          <span>🛒 {carrito.length} artículos</span>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="pos-layout">
        {/* PANEL DE PRODUCTOS */}
        <div className="productos-panel">
          {/* Búsqueda */}
          <div className="productos-busca">
            <input
              type="text"
              placeholder="🔍 Buscar producto o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button 
              onClick={() => setEscanerActivo(!escanerActivo)}
              className={`scanner-toggle ${escanerActivo ? 'activo' : ''}`}
            >
              {escanerActivo ? '❌' : '📱'}
            </button>
          </div>

          {/* Escáner */}
          {escanerActivo && (
            <div className="scanner-wrapper">
              <EscanerZXing 
                onScan={manejarCodigoEscaneado}
                onProductoEncontrado={agregarAlCarrito}
                onProductoNoEncontrado={(codigo) => manejarCodigoEscaneado(codigo)}
                productos={productos}
                isActive={escanerActivo}
              />
            </div>
          )}

          {/* Categorías */}
          <div className="categorias-tabs">
            {categorias.map(cat => (
              <button
                key={cat}
                className={`categoria-tab ${categoriaSeleccionada === cat ? 'activa' : ''}`}
                onClick={() => setCategoriaSeleccionada(cat)}
              >
                {cat === 'todos' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          {/* Lista de productos */}
          <div className="productos-lista">
            {productosFiltrados.length === 0 ? (
              <div className="productos-vacios">
                No hay productos disponibles
              </div>
            ) : (
              productosFiltrados.map(producto => (
                <div 
                  key={producto.id} 
                  className="producto-item"
                  onClick={() => agregarAlCarrito(producto)}
                >
                  {producto.imagen && <img src={producto.imagen} alt={producto.nombre} />}
                  <div className="producto-info">
                    <div className="producto-nombre">{producto.nombre}</div>
                    <div className="producto-precio">${(producto.precio || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                    <div className={`producto-stock ${(producto.stock || 0) < 10 ? 'bajo' : ''}`}>
                      Stock: {producto.stock || 0}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL DEL CARRITO */}
        <div className="carrito-panel">
          <h2 className="carrito-titulo">🛒 Carrito</h2>

          {/* Items del carrito */}
          <div className="carrito-items">
            {carrito.length === 0 ? (
              <div className="carrito-vacio">📭 Carrito vacío</div>
            ) : (
              carrito.map(item => (
                <div key={item.id} className="carrito-item">
                  <div className="carrito-item-info">
                    <p className="carrito-item-nombre">{item.producto.nombre}</p>
                    <p className="carrito-item-cantidad">x{item.cantidad} @ ${item.precioUnitario.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="carrito-item-controles">
                    <button className="carrito-item-btn" onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}>-</button>
                    <button className="carrito-item-btn" onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}>+</button>
                    <button className="carrito-item-btn" onClick={() => removerDelCarrito(item.id)}>🗑</button>
                  </div>
                  <div className="carrito-item-precio">${item.subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div>
                </div>
              ))
            )}
          </div>

          {/* Resumen */}
          <div className="carrito-resumen">
            <div className="resumen-fila subtotal">
              <span>Subtotal</span>
              <span className="resumen-valor">${calcularTotales.subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>

            {descuento > 0 && (
              <div className="resumen-fila descuento">
                <span>Descuento ({descuento}%)</span>
                <span className="resumen-valor">-${calcularTotales.descuentoAplicado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
              </div>
            )}

            <div className="resumen-fila impuesto">
              <span>IVA (19%)</span>
              <span className="resumen-valor">${calcularTotales.iva.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>

            <div className="resumen-fila total">
              <span>TOTAL</span>
              <span className="resumen-valor">${calcularTotales.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>

            {/* Descuento */}
            <input
              type="number"
              placeholder="Descuento %"
              min="0"
              max="100"
              value={descuento}
              onChange={(e) => setDescuento(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="resumen-input"
            />

            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as 'efectivo' | 'tarjeta' | 'transferencia')}
              aria-label="Método de pago"
              title="Método de pago"
              className="resumen-input"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          {/* Botones */}
          <div className="botones-accion">
            <button 
              className="btn-accion btn-procesar"
              onClick={procesarVenta}
              disabled={carrito.length === 0 || procesandoVenta}
            >
              {procesandoVenta ? '⏳ Procesando...' : '✅ Procesar Venta'}
            </button>
            <button 
              className="btn-accion btn-limpiar"
              onClick={limpiarCarrito}
              disabled={carrito.length === 0 || procesandoVenta}
            >
              🗑️ Limpiar Carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PuntoVenta;
