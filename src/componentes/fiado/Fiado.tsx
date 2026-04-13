// src/componentes/Fiado.tsx
import React, { useState, useEffect } from 'react';
import '../../styles/Fiado.css';
import { deudaService } from '../../services/fiado/deudaService';
import { Deuda, TransaccionDeuda } from '../../types/pos.types';
import { useAuth } from '../../context/AuthContext';

interface FiadoProps {}

function Fiado({}: FiadoProps) {
  // Contexto de autenticación
  const { usuario, isJefe } = useAuth();

  // Estados
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'cliente' | 'empleado' | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  // Modal crear deuda
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nuevaDeuda, setNuevaDeuda] = useState({
    tipo: 'cliente' as 'cliente' | 'empleado',
    referencia: '',
    nombrePersona: '',
    monto: 0,
    razon: ''
  });

  // Modal transacción
  const [modalTransaccionAbierto, setModalTransaccionAbierto] = useState(false);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<Deuda | null>(null);
  const [transacciones, setTransacciones] = useState<TransaccionDeuda[]>([]);
  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    tipo: 'abono' as 'cargo' | 'abono',
    monto: 0,
    razon: ''
  });

  // Cargar deudas
  const cargarDeudas = async () => {
    try {
      setCargando(true);
      setError('');
      const resultado = await deudaService.obtenerDeudas(
        filtroTipo || undefined,
        filtroEstado || undefined
      );
      setDeudas(resultado);
    } catch (err: any) {
      setError(err.message || 'Error al cargar deudas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDeudas();
  }, []);

  // Crear nueva deuda
  const handleCrearDeuda = async () => {
    try {
      if (!nuevaDeuda.referencia || !nuevaDeuda.nombrePersona || !nuevaDeuda.monto) {
        setError('Complete todos los campos requeridos');
        return;
      }

      if (nuevaDeuda.monto <= 0) {
        setError('El monto debe ser mayor a 0');
        return;
      }

      await deudaService.crearDeuda(nuevaDeuda);
      setError('');
      setNuevaDeuda({
        tipo: 'cliente',
        referencia: '',
        nombrePersona: '',
        monto: 0,
        razon: ''
      });
      setModalCrearAbierto(false);
      await cargarDeudas();
    } catch (err: any) {
      setError(err.message || 'Error al crear deuda');
    }
  };

  // Abrir deuda para ver transacciones
  const abrirTransacciones = async (deuda: Deuda) => {
    try {
      setDeudaSeleccionada(deuda);
      const txns = await deudaService.obtenerTransacciones(deuda.id);
      setTransacciones(txns);
      setModalTransaccionAbierto(true);
    } catch (err: any) {
      setError(err.message || 'Error al cargar transacciones');
    }
  };

  // Registrar transacción
  const handleRegistrarTransaccion = async () => {
    try {
      if (!deudaSeleccionada || nuevaTransaccion.monto <= 0) {
        setError('Monto debe ser válido');
        return;
      }

      const resultado = await deudaService.registrarTransaccion({
        deudaId: deudaSeleccionada.id,
        tipo: nuevaTransaccion.tipo,
        monto: nuevaTransaccion.monto,
        razon: nuevaTransaccion.razon
      });

      setError('');
      setNuevaTransaccion({
        tipo: 'abono',
        monto: 0,
        razon: ''
      });

      // Actualizar transacciones
      const txns = await deudaService.obtenerTransacciones(deudaSeleccionada.id);
      setTransacciones(txns);

      // Actualizar deuda en lista
      const deudaActualizada = await deudaService.obtenerDeudasPersona(
        deudaSeleccionada.referencia
      );

      // Crear notificación
      alert(`✅ Transacción registrada. Nuevo saldo: $${resultado.nuevoSaldo}`);

      // Recargar toda la lista
      await cargarDeudas();
    } catch (err: any) {
      setError(err.message || 'Error al registrar transacción');
    }
  };

  const obtenerColor = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return '#4CAF50'; // Verde
      case 'parcial':
        return '#FFC107'; // Amarillo
      case 'pendiente':
        return '#F44336'; // Rojo
      default:
        return '#999';
    }
  };

  const total_Deuda = deudas.reduce((sum, d) => sum + d.saldo, 0);

  return (
    <div className="fiado-container">
      <header className="fiado-header">
        <h1>💳 Sistema de Fiado</h1>
        <p className="subtitulo">Gestiona deudas de clientes y consumo de empleados</p>
      </header>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* ESTADÍSTICAS */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>💰 Total Deuda Pendiente</h3>
          <p className="stat-value">${total_Deuda.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>📊 Total Registros</h3>
          <p className="stat-value">{deudas.length}</p>
        </div>
        <div className="stat-card">
          <h3>✅ Pagadas</h3>
          <p className="stat-value">{deudas.filter(d => d.estado === 'pagada').length}</p>
        </div>
        <div className="stat-card">
          <h3>⚠️ Pendientes</h3>
          <p className="stat-value">{deudas.filter(d => d.estado === 'pendiente').length}</p>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="controles">
        <button className="btn btn-primary" onClick={() => setModalCrearAbierto(true)}>
          ➕ Nueva Deuda
        </button>

        <div className="filtros">
          <select
            id="filtro-tipo-fiado"
            aria-label="Filtrar por tipo de deuda"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
          >
            <option value="">Todos los tipos</option>
            <option value="cliente">Cliente</option>
            <option value="empleado">Empleado</option>
          </select>

          <select
            id="filtro-estado-fiado"
            aria-label="Filtrar por estado de deuda"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
          </select>

          <button className="btn btn-secondary" onClick={cargarDeudas}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* LISTA DE DEUDAS */}
      <div className="deudas-container">
        {cargando ? (
          <div className="loading">⏳ Cargando deudas...</div>
        ) : deudas.length === 0 ? (
          <div className="empty-state">
            <p>No hay deudas registradas</p>
            <button className="btn btn-primary" onClick={() => setModalCrearAbierto(true)}>
              Crear primera deuda
            </button>
          </div>
        ) : (
          <div className="deudas-grid">
            {deudas.map((deuda) => (
              <div key={deuda.id} className="deuda-card">
                <div className="deuda-header">
                  <div className="deuda-tipo-icon">
                    {deuda.tipo === 'cliente' ? '👤' : '👨‍💼'}
                  </div>
                  <div className="deuda-info">
                    <h3>{deuda.nombrePersona}</h3>
                    <p className="deuda-tipo">
                      {deuda.tipo === 'cliente' ? 'Cliente' : 'Empleado'}
                    </p>
                  </div>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: obtenerColor(deuda.estado) }}
                  >
                    {deuda.estado.toUpperCase()}
                  </span>
                </div>

                <div className="deuda-body">
                  <div className="deuda-monto">
                    <span className="label">Monto Original:</span>
                    <span className="valor">${deuda.monto.toLocaleString()}</span>
                  </div>
                  <div className="deuda-saldo">
                    <span className="label">Saldo Pendiente:</span>
                    <span className="valor">${deuda.saldo.toLocaleString()}</span>
                  </div>
                  <div className="deuda-razon">
                    <span className="label">Razón:</span>
                    <span className="valor">{deuda.razon}</span>
                  </div>
                  <div className="deuda-fecha">
                    <span className="label">Fecha:</span>
                    <span className="valor">
                      {new Date(deuda.fecha).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="deuda-footer">
                  <button
                    className="btn btn-info"
                    onClick={() => abrirTransacciones(deuda)}
                  >
                    📋 Ver Historial
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CREAR DEUDA */}
      {modalCrearAbierto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>➕ Nueva Deuda</h2>
              <button
                className="close-btn"
                onClick={() => setModalCrearAbierto(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Tipo:</label>
                <select
                  value={nuevaDeuda.tipo}
                  onChange={(e) =>
                    setNuevaDeuda({ ...nuevaDeuda, tipo: e.target.value as any })
                  }
                >
                  <option value="cliente">👤 Cliente</option>
                  <option value="empleado">👨‍💼 Empleado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={nuevaDeuda.nombrePersona}
                  onChange={(e) =>
                    setNuevaDeuda({ ...nuevaDeuda, nombrePersona: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Referencia/ID:</label>
                <input
                  type="text"
                  placeholder="ID único (cédula, email, etc)"
                  value={nuevaDeuda.referencia}
                  onChange={(e) =>
                    setNuevaDeuda({ ...nuevaDeuda, referencia: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Monto ($):</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  step="100"
                  value={nuevaDeuda.monto}
                  onChange={(e) =>
                    setNuevaDeuda({ ...nuevaDeuda, monto: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="form-group">
                <label>Razón:</label>
                <input
                  type="text"
                  placeholder="Compra de productos, consumo personal, etc"
                  value={nuevaDeuda.razon}
                  onChange={(e) =>
                    setNuevaDeuda({ ...nuevaDeuda, razon: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setModalCrearAbierto(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCrearDeuda}>
                Crear Deuda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSACCIONES */}
      {modalTransaccionAbierto && deudaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal modal-transacciones">
            <div className="modal-header">
              <h2>📋 Historial - {deudaSeleccionada.nombrePersona}</h2>
              <button
                className="close-btn"
                onClick={() => setModalTransaccionAbierto(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Saldo actual */}
              <div className="deuda-resumen">
                <div className="resumen-item">
                  <span>Monto Original:</span>
                  <strong>${deudaSeleccionada.monto.toLocaleString()}</strong>
                </div>
                <div className="resumen-item">
                  <span>Saldo Pendiente:</span>
                  <strong>${deudaSeleccionada.saldo.toLocaleString()}</strong>
                </div>
              </div>

              {/* Historial de transacciones */}
              <div className="transacciones-lista">
                <h3>Movimientos:</h3>
                {transacciones.length === 0 ? (
                  <p className="sin-transacciones">Sin movimientos registrados</p>
                ) : (
                  <ul>
                    {transacciones.map((txn) => (
                      <li key={txn.id} className={`txn ${txn.tipo}`}>
                        <div className="txn-tipo">
                          {txn.tipo === 'cargo' ? '➕' : '➖'} {txn.tipo.toUpperCase()}
                        </div>
                        <div className="txn-info">
                          <span className="txn-razon">{txn.razon}</span>
                          <span className="txn-fecha">
                            {new Date(txn.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div className={`txn-monto ${txn.tipo}`}>
                          {txn.tipo === 'cargo' ? '+' : '-'}$
                          {txn.monto.toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Registrar nueva transacción */}
              <div className="nueva-transaccion">
                <h3>Registrar Movimiento:</h3>

                <div className="form-group">
                  <label>Tipo:</label>
                  <select
                    value={nuevaTransaccion.tipo}
                    onChange={(e) =>
                      setNuevaTransaccion({
                        ...nuevaTransaccion,
                        tipo: e.target.value as any
                      })
                    }
                  >
                    <option value="cargo">➕ Cargo (se lleva algo)</option>
                    <option value="abono">➖ Abono (paga deuda)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Monto ($):</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="100"
                    value={nuevaTransaccion.monto}
                    onChange={(e) =>
                      setNuevaTransaccion({
                        ...nuevaTransaccion,
                        monto: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Razón:</label>
                  <input
                    type="text"
                    placeholder="Descripción del movimiento"
                    value={nuevaTransaccion.razon}
                    onChange={(e) =>
                      setNuevaTransaccion({
                        ...nuevaTransaccion,
                        razon: e.target.value
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setModalTransaccionAbierto(false)}
              >
                Cerrar
              </button>
              <button className="btn btn-primary" onClick={handleRegistrarTransaccion}>
                Registrar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fiado;
