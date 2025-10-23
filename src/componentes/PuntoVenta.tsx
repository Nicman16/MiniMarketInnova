// src/componentes/PuntoVenta.tsx
import React, { useState, useEffect } from 'react';
import '../styles/PuntoVenta.css';
import EscanerCodigoBarras from './EscanerCodigoBarras';
import { syncService } from '../services/syncService';
import { ventasService } from '../services/ventasService';
import { Producto, ItemVenta, Venta } from '../types/pos.types';

function PuntoVenta() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [escanerActivo, setEscanerActivo] = useState(false);
  const [total, setTotal] = useState(0);
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [sesionCaja, setSesionCaja] = useState<any>(null);

  useEffect(() => {
    // Suscribirse a productos
    const unsubscribe = syncService.subscribe((event: any, data?: any) => {
      if (event === 'productos' || !event) {
        setProductos(data || syncService.obtenerProductos());
      }
      if (event === 'codigo-escaneado') {
        agregarProductoPorCodigo(data.codigo);
      }
    });

    setProductos(syncService.obtenerProductos());
    verificarSesionCaja();

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Calcular total del carrito
    const nuevoTotal = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    setTotal(nuevoTotal);
  }, [carrito]);

  const verificarSesionCaja = async () => {
    const sesion = await ventasService.obtenerSesionActiva();
    setSesionCaja(sesion);
  };

  const agregarProductoPorCodigo = (codigo: string) => {
    const producto = productos.find(p => p.codigoBarras === codigo);
    if (producto) {
      agregarAlCarrito(producto);
    } else {
      alert(`Producto con código ${codigo} no encontrado`);
    }
  };

  const buscarProducto = (termino: string) => {
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      p.codigoBarras.includes(termino)
    );
  };

  const agregarAlCarrito = (producto: Producto, cantidad: number = 1) => {
    if (producto.cantidad < cantidad) {
      alert('Stock insuficiente');
      return;
    }

    const itemExistente = carrito.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      const nuevaCantidad = itemExistente.cantidad + cantidad;
      if (producto.cantidad < nuevaCantidad) {
        alert('Stock insuficiente');
        return;
      }
      
      setCarrito(carrito.map(item => 
        item.producto.id === producto.id
          ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * producto.precio }
          : item
      ));
    } else {
      const nuevoItem: ItemVenta = {
        producto,
        cantidad,
        precioUnitario: producto.precio,
        subtotal: cantidad * producto.precio
      };
      setCarrito([...carrito, nuevoItem]);
    }
  };

  const eliminarDelCarrito = (productoId: number) => {
    setCarrito(carrito.filter(item => item.producto.id !== productoId));
  };

  const modificarCantidad = (productoId: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(productoId);
      return;
    }

    const producto = productos.find(p => p.id === productoId);
    if (producto && producto.cantidad < nuevaCantidad) {
      alert('Stock insuficiente');
      return;
    }

    setCarrito(carrito.map(item => 
      item.producto.id === productoId
        ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precioUnitario }
        : item
    ));
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (!sesionCaja) {
      alert('Debe abrir una sesión de caja primero');
      return;
    }

    if (metodoPago === 'efectivo') {
      const recibido = parseFloat(efectivoRecibido);
      if (!recibido || recibido < total) {
        alert('Monto insuficiente');
        return;
      }
    }

    try {
      const venta: Partial<Venta> = {
        items: carrito,
        subtotal: total * 0.84, // Sin IVA
        iva: total * 0.16,
        descuentos: 0,
        total: total,
        metodoPago: metodoPago,
        vendedor: sesionCaja.empleado,
        estado: 'completada'
      };

      const ventaGuardada = await ventasService.procesarVenta(venta);
      
      // Actualizar inventario
      for (const item of carrito) {
        const productoActualizado = {
          ...item.producto,
          cantidad: item.producto.cantidad - item.cantidad
        };
        syncService.actualizarProducto(productoActualizado);
      }

      // Limpiar carrito
      setCarrito([]);
      setEfectivoRecibido('');
      setBusqueda('');

      // Mostrar resumen
      mostrarTicket(ventaGuardada);

    } catch (error) {
      alert('Error al procesar la venta');
      console.error(error);
    }
  };

  const mostrarTicket = (venta: Venta) => {
    const cambio = metodoPago === 'efectivo' ? parseFloat(efectivoRecibido) - total : 0;
    
    alert(`
🧾 TICKET DE VENTA
━━━━━━━━━━━━━━━━━━━━
📅 ${new Date().toLocaleString()}
🏪 MiniMarket Innova
━━━━━━━━━━━━━━━━━━━━

${carrito.map(item => 
  `${item.producto.nombre}\n${item.cantidad} x $${item.precioUnitario.toLocaleString()} = $${item.subtotal.toLocaleString()}`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
💰 TOTAL: $${total.toLocaleString()}
💳 ${metodoPago.toUpperCase()}
${metodoPago === 'efectivo' ? `💵 Recibido: $${parseFloat(efectivoRecibido).toLocaleString()}\n💸 Cambio: $${cambio.toLocaleString()}` : ''}

¡Gracias por su compra! 🛒
    `);
  };

  const cambio = metodoPago === 'efectivo' && efectivoRecibido 
    ? parseFloat(efectivoRecibido) - total 
    : 0;

  if (!sesionCaja) {
    return (
      <div className="pos-container">
        <h2>🚨 Sesión de Caja Requerida</h2>
        <p>Debe abrir una sesión de caja antes de realizar ventas.</p>
        <button className="button" onClick={() => window.location.href = '#/caja'}>
          🔓 Abrir Caja
        </button>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <header className="pos-header">
        <h1>🛒 Punto de Venta</h1>
        <div className="sesion-info">
          <span>👨‍💼 {sesionCaja.empleado.nombre}</span>
          <span>💰 Caja: ${sesionCaja.montoApertura.toLocaleString()}</span>
        </div>
      </header>

      <div className="pos-layout">
        {/* Panel izquierdo - Productos */}
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
            <EscanerCodigoBarras 
              onScan={agregarProductoPorCodigo}
              isActive={escanerActivo}
            />
          )}

          <div className="productos-grid">
            {(busqueda ? buscarProducto(busqueda) : productos).map(producto => (
              <div key={producto.id} className="producto-card" onClick={() => agregarAlCarrito(producto)}>
                <div className="producto-imagen">
                  {producto.imagen ? (
                    <img src={producto.imagen} alt={producto.nombre} />
                  ) : (
                    '📦'
                  )}
                </div>
                <h4>{producto.nombre}</h4>
                <p className="precio">${producto.precio.toLocaleString()}</p>
                <p className="stock">Stock: {producto.cantidad}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Panel derecho - Carrito */}
        <div className="carrito-panel">
          <h3>🛒 Carrito ({carrito.length})</h3>
          
          <div className="carrito-items">
            {carrito.map(item => (
              <div key={item.producto.id} className="carrito-item">
                <div className="item-info">
                  <h4>{item.producto.nombre}</h4>
                  <p>${item.precioUnitario.toLocaleString()} c/u</p>
                </div>
                <div className="item-cantidad">
                  <button onClick={() => modificarCantidad(item.producto.id, item.cantidad - 1)}>
                    ➖
                  </button>
                  <span>{item.cantidad}</span>
                  <button onClick={() => modificarCantidad(item.producto.id, item.cantidad + 1)}>
                    ➕
                  </button>
                </div>
                <div className="item-subtotal">
                  ${item.subtotal.toLocaleString()}
                </div>
                <button 
                  className="eliminar-btn"
                  onClick={() => eliminarDelCarrito(item.producto.id)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="total-container">
            <div className="total-line">
              <span>Subtotal:</span>
              <span>${(total * 0.84).toLocaleString()}</span>
            </div>
            <div className="total-line">
              <span>IVA (16%):</span>
              <span>${(total * 0.16).toLocaleString()}</span>
            </div>
            <div className="total-final">
              <span>TOTAL:</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>

          <div className="pago-container">
            <div className="metodo-pago">
              <label>💳 Método de pago:</label>
              <select 
                value={metodoPago} 
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className="input"
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="tarjeta">💳 Tarjeta</option>
                <option value="transferencia">📱 Transferencia</option>
              </select>
            </div>

            {metodoPago === 'efectivo' && (
              <div className="efectivo-container">
                <label>💵 Efectivo recibido:</label>
                <input
                  type="number"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  placeholder="0"
                  className="input"
                />
                {cambio > 0 && (
                  <p className="cambio">💸 Cambio: ${cambio.toLocaleString()}</p>
                )}
              </div>
            )}

            <div className="acciones-venta">
              <button 
                className="button danger"
                onClick={() => setCarrito([])}
                disabled={carrito.length === 0}
              >
                🗑️ Limpiar
              </button>
              <button 
                className="button success"
                onClick={procesarVenta}
                disabled={carrito.length === 0 || (metodoPago === 'efectivo' && cambio < 0)}
              >
                💰 Cobrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PuntoVenta;