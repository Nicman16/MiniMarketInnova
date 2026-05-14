// src/componentes/PuntoVenta.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Producto, ItemVenta } from '../../types/pos.types';
import { productoService } from '../../services/inventario/productoService';
import { ventaService } from '../../services/ventas/ventaService';
import { useAuth } from '../../context/AuthContext';
import EscanerZXing from '../inventario/EscanerZXing';
import '../../styles/PuntoVenta.css';

type MetodoPago = 'efectivo' | 'nequi' | 'datafono';

const RECARGO_DATAFONO = 0.06; // 6%

interface ModalPagoState {
  abierto: boolean;
  metodo: MetodoPago;
  dineroRecibido: string;
}

const MODAL_INICIAL: ModalPagoState = {
  abierto: false,
  metodo: 'efectivo',
  dineroRecibido: ''
};

function PuntoVenta() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [escanerActivo, setEscanerActivo] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [alertaStock, setAlertaStock] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [modalPago, setModalPago] = useState<ModalPagoState>(MODAL_INICIAL);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState<string | null>(null);

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

  // Oculta automáticamente la alerta de stock tras unos segundos
  useEffect(() => {
    if (!alertaStock) return;
    const timer = window.setTimeout(() => setAlertaStock(''), 4500);
    return () => window.clearTimeout(timer);
  }, [alertaStock]);

  // Oculta el mensaje de éxito tras 4 segundos
  useEffect(() => {
    if (!ventaExitosa) return;
    const timer = window.setTimeout(() => setVentaExitosa(null), 4000);
    return () => window.clearTimeout(timer);
  }, [ventaExitosa]);

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

  // Calcular totales — IVA 0%: precio de venta es el precio original del producto
  const calcularTotales = useMemo(() => {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const descuentoAplicado = subtotal * (descuento / 100);
    const totalBase = subtotal - descuentoAplicado;
    return { subtotal, descuentoAplicado, totalBase };
  }, [carrito, descuento]);

  // Totales del modal según método de pago seleccionado
  const totalesModal = useMemo(() => {
    const recargo = modalPago.metodo === 'datafono'
      ? calcularTotales.totalBase * RECARGO_DATAFONO
      : 0;
    const total = calcularTotales.totalBase + recargo;
    const cambio = modalPago.metodo === 'efectivo'
      ? Number(modalPago.dineroRecibido || 0) - total
      : null;
    return { recargo, total, cambio };
  }, [modalPago.metodo, modalPago.dineroRecibido, calcularTotales.totalBase]);

  // Limpiar carrito
  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    setDescuento(0);
  }, []);

  // Manejar código escaneado
  const manejarCodigoEscaneado = useCallback((codigo: string) => {
    console.log('🔍 Código escaneado:', codigo);
    
    const producto = productos.find(p => p.codigoBarras === codigo);
    
    if (producto) {
      agregarAlCarrito(producto);

      if ((producto.stock ?? 0) <= 0) {
        setAlertaStock(`⚠️ ${producto.nombre} está sin stock, pero se agregó automáticamente al carrito.`);
      } else {
        setAlertaStock('');
      }

      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      setEscanerActivo(false);
    } else {
      console.log('❌ Producto no encontrado para código:', codigo);
      setAlertaStock('⚠️ El producto escaneado no existe en inventario.');
    }
  }, [productos, agregarAlCarrito]);

  // Abrir modal de pago (reemplaza la confirmación directa)
  const abrirModalPago = useCallback(() => {
    if (carrito.length === 0) {
      setError('El carrito está vacío');
      return;
    }
    if (!usuario) {
      setError('Debe iniciar sesión para registrar una venta');
      return;
    }
    setModalPago({ ...MODAL_INICIAL, abierto: true });
  }, [carrito.length, usuario]);

  // Confirmar y registrar la venta desde el modal
  const confirmarVenta = useCallback(async () => {
    if (modalPago.metodo === 'efectivo') {
      const recibido = Number(modalPago.dineroRecibido || 0);
      if (recibido < totalesModal.total) {
        setError('El dinero recibido es insuficiente para cubrir el total');
        return;
      }
    }

    try {
      setProcesandoVenta(true);
      setError('');

      await ventaService.registrarVenta({
        items: carrito,
        subtotal: calcularTotales.subtotal,
        iva: 0,
        descuentos: calcularTotales.descuentoAplicado,
        total: totalesModal.total,
        metodoPago: modalPago.metodo
      });

      await cargarProductos();

      const mensajeExito = modalPago.metodo === 'efectivo'
        ? `✅ Venta registrada. Cambio: $${(totalesModal.cambio ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
        : '✅ Venta registrada correctamente.';

      setModalPago(MODAL_INICIAL);
      limpiarCarrito();
      setVentaExitosa(mensajeExito);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta');
    } finally {
      setProcesandoVenta(false);
    }
  }, [
    modalPago,
    totalesModal,
    carrito,
    calcularTotales,
    cargarProductos,
    limpiarCarrito
  ]);

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
      {ventaExitosa && <div className="success-msg">{ventaExitosa}</div>}
      {alertaStock && <div className="stock-warning-msg">{alertaStock}</div>}

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
                {productos.length === 0 ? 'No hay productos en inventario. Agrega productos desde Inventario para empezar a vender.' : 'No hay resultados con esos filtros.'}
                <div className="productos-vacios-actions">
                  <button className="categoria-tab" onClick={() => setCategoriaSeleccionada('todos')}>Ver todos</button>
                  <button className="scanner-toggle" onClick={() => setEscanerActivo((v) => !v)}>Escanear</button>
                </div>
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

            <div className="resumen-fila impuesto">
              <span>IVA (0%)</span>
              <span className="resumen-valor">$0</span>
            </div>

            {descuento > 0 && (
              <div className="resumen-fila descuento">
                <span>Descuento ({descuento}%)</span>
                <span className="resumen-valor">-${calcularTotales.descuentoAplicado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
              </div>
            )}

            <div className="resumen-fila total">
              <span>TOTAL</span>
              <span className="resumen-valor">${calcularTotales.totalBase.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>

            {/* Descuento */}
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="Descuento %"
              min="0"
              max="100"
              value={descuento}
              onChange={(e) => setDescuento(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="resumen-input"
            />
          </div>

          {/* Botones */}
          <div className="botones-accion">
            <button 
              className="btn-accion btn-procesar"
              onClick={abrirModalPago}
              disabled={carrito.length === 0 || procesandoVenta}
            >
              {procesandoVenta ? '⏳ Procesando...' : '💳 Pagar'}
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

      {/* ===== MODAL DE PAGO ===== */}
      {modalPago.abierto && (
        <div className="modal-pago-overlay" role="dialog" aria-modal="true" aria-label="Modal de pago">
          <div className="modal-pago-card">
            <div className="modal-pago-header">
              <h2>💳 Seleccionar Método de Pago</h2>
              <button
                className="modal-pago-close"
                onClick={() => setModalPago(MODAL_INICIAL)}
                aria-label="Cerrar modal"
                disabled={procesandoVenta}
              >✕</button>
            </div>

            {/* Selector de método */}
            <div className="modal-metodos">
              {(['efectivo', 'nequi', 'datafono'] as MetodoPago[]).map((m) => (
                <button
                  key={m}
                  className={`modal-metodo-btn ${modalPago.metodo === m ? 'activo' : ''}`}
                  onClick={() => setModalPago(prev => ({ ...prev, metodo: m, dineroRecibido: '' }))}
                >
                  {m === 'efectivo' && '💵 Efectivo'}
                  {m === 'nequi'    && '📲 Nequi'}
                  {m === 'datafono' && '💳 Datáfono'}
                </button>
              ))}
            </div>

            {/* Desglose de pago */}
            <div className="modal-pago-desglose">
              <div className="modal-pago-fila">
                <span>Subtotal</span>
                <span>${calcularTotales.subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="modal-pago-fila impuesto">
                <span>IVA (0%)</span>
                <span>$0</span>
              </div>
              {calcularTotales.descuentoAplicado > 0 && (
                <div className="modal-pago-fila descuento">
                  <span>Descuento ({descuento}%)</span>
                  <span>-${calcularTotales.descuentoAplicado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              {modalPago.metodo === 'datafono' && (
                <div className="modal-pago-fila recargo">
                  <span>Recargo datáfono (6%)</span>
                  <span>+${totalesModal.recargo.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              <div className="modal-pago-fila total">
                <span>TOTAL A PAGAR</span>
                <span>${totalesModal.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Panel específico por método */}
            {modalPago.metodo === 'efectivo' && (
              <div className="modal-pago-panel">
                <label htmlFor="dinero-recibido">Dinero recibido</label>
                <input
                  id="dinero-recibido"
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  min="0"
                  placeholder={`Mínimo $${totalesModal.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
                  value={modalPago.dineroRecibido}
                  onChange={(e) => setModalPago(prev => ({ ...prev, dineroRecibido: e.target.value }))}
                  className="resumen-input"
                  autoFocus
                />
                {Number(modalPago.dineroRecibido || 0) >= totalesModal.total && (
                  <div className="modal-cambio">
                    💰 Cambio: <strong>${(totalesModal.cambio ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</strong>
                  </div>
                )}
              </div>
            )}

            {modalPago.metodo === 'nequi' && (
              <div className="modal-pago-panel nequi">
                <p>📲 <strong>Pago por Nequi</strong></p>
                <p>Confirma que el cliente ya realizó la transferencia de <strong>${totalesModal.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</strong> antes de continuar.</p>
              </div>
            )}

            {modalPago.metodo === 'datafono' && (
              <div className="modal-pago-panel datafono">
                <p>💳 <strong>Pago con Datáfono</strong></p>
                <p>Se aplica un recargo del 6% por uso de datáfono. Total a cobrar: <strong>${totalesModal.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</strong>.</p>
              </div>
            )}

            {error && <div className="error-msg" style={{ marginTop: '0.75rem' }}>{error}</div>}

            <div className="modal-pago-acciones">
              <button
                className="btn-accion btn-procesar"
                onClick={confirmarVenta}
                disabled={procesandoVenta || (
                  modalPago.metodo === 'efectivo' && Number(modalPago.dineroRecibido || 0) < totalesModal.total
                )}
              >
                {procesandoVenta ? '⏳ Registrando...' : '✅ Confirmar Venta'}
              </button>
              <button
                className="btn-accion btn-limpiar"
                onClick={() => { setModalPago(MODAL_INICIAL); setError(''); }}
                disabled={procesandoVenta}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PuntoVenta;
