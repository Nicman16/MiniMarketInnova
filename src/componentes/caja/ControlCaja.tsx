// src/componentes/ControlCaja.tsx
import React, { useState, useEffect } from 'react';
import '../../styles/ControlCaja.css';
import { cajaService } from '../../services/caja/cajaService';
import { SesionCaja, MovimientoCaja, Empleado } from '../../types/pos.types';

function ControlCaja() {
  const [sesionActual, setSesionActual] = useState<SesionCaja | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [pinEmpleado, setPinEmpleado] = useState('');
  const [montoApertura, setMontoApertura] = useState('');
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    tipo: 'ingreso' as 'ingreso' | 'egreso',
    monto: '',
    concepto: ''
  });
  const [resumenDia, setResumenDia] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const sesion = await cajaService.obtenerSesionActiva();
      const empleadosData = await cajaService.obtenerEmpleados();
      const movimientosData = await cajaService.obtenerMovimientosDia();
      const resumen = await cajaService.obtenerResumenDia();

      setSesionActual(sesion);
      setEmpleados(empleadosData);
      setMovimientos(movimientosData);
      setResumenDia(resumen);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const abrirCaja = async () => {
    if (!empleadoSeleccionado || !pinEmpleado || !montoApertura) {
      alert('Complete todos los campos');
      return;
    }

    try {
      const empleado = empleados.find(e => e.id === empleadoSeleccionado);
      if (!empleado || empleado.pin !== pinEmpleado) {
        alert('PIN incorrecto');
        return;
      }

      const nuevaSesion = await cajaService.abrirCaja({
        empleado,
        montoApertura: parseFloat(montoApertura)
      });

      setSesionActual(nuevaSesion);
      setEmpleadoSeleccionado('');
      setPinEmpleado('');
      setMontoApertura('');
      
      alert('✅ Caja abierta correctamente');
    } catch (error) {
      alert('Error al abrir caja');
      console.error(error);
    }
  };

  const cerrarCaja = async () => {
    if (!sesionActual) return;

    try {
      const resumenFinal = await cajaService.obtenerResumenParaCierre();
      
      const confirmar = window.confirm(`
🔒 CERRAR CAJA
━━━━━━━━━━━━━━━━━━━━
💰 Monto apertura: $${sesionActual.montoApertura.toLocaleString()}
💵 Ventas efectivo: $${resumenFinal.ventasEfectivo.toLocaleString()}
💳 Ventas tarjeta: $${resumenFinal.ventasTarjeta.toLocaleString()}
📈 Ingresos: $${resumenFinal.ingresos.toLocaleString()}
📉 Egresos: $${resumenFinal.egresos.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
💰 TOTAL ESPERADO: $${resumenFinal.totalEsperado.toLocaleString()}

¿Confirmar cierre de caja?
      `);

      if (confirmar) {
        await cajaService.cerrarCaja(sesionActual.id, resumenFinal.totalEsperado);
        setSesionActual(null);
        cargarDatos();
        alert('✅ Caja cerrada correctamente');
      }
    } catch (error) {
      alert('Error al cerrar caja');
      console.error(error);
    }
  };

  const registrarMovimiento = async () => {
    if (!sesionActual || !nuevoMovimiento.monto || !nuevoMovimiento.concepto) {
      alert('Complete todos los campos');
      return;
    }

    try {
      const movimiento = await cajaService.registrarMovimiento({
        ...nuevoMovimiento,
        monto: parseFloat(nuevoMovimiento.monto),
        empleado: sesionActual.empleado
      });

      setMovimientos([movimiento, ...movimientos]);
      setNuevoMovimiento({ tipo: 'ingreso', monto: '', concepto: '' });
      cargarDatos();
      
      alert('✅ Movimiento registrado');
    } catch (error) {
      alert('Error al registrar movimiento');
      console.error(error);
    }
  };

  const arquearCaja = () => {
    if (!resumenDia) return;

    const arqueo = `
💰 ARQUEO DE CAJA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 ${new Date().toLocaleDateString()}
👨‍💼 ${sesionActual?.empleado.nombre || 'N/A'}

🔓 APERTURA:
💵 Monto inicial: $${sesionActual?.montoApertura.toLocaleString() || '0'}

💰 VENTAS:
🛒 Total ventas: $${resumenDia.totalVentas.toLocaleString()}
💵 Efectivo: $${resumenDia.ventasEfectivo.toLocaleString()}
💳 Tarjetas: $${resumenDia.ventasTarjeta.toLocaleString()}
📱 Transferencias: $${resumenDia.ventasTransferencia.toLocaleString()}

📊 MOVIMIENTOS:
📈 Ingresos extra: $${resumenDia.ingresos.toLocaleString()}
📉 Egresos: $${resumenDia.egresos.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 TOTAL EN CAJA: $${resumenDia.totalEnCaja.toLocaleString()}

📊 RESUMEN:
🎯 Ventas del día: ${resumenDia.cantidadVentas}
🏆 Ticket promedio: $${Math.round(resumenDia.totalVentas / resumenDia.cantidadVentas).toLocaleString()}
    `;

    alert(arqueo);
  };

  return (
    <div className="caja-container">
      <header className="caja-header">
        <h1>💵 Control de Caja</h1>
        <div className="estado-caja">
          {sesionActual ? (
            <div className="caja-abierta">
              <span className="status">🟢 CAJA ABIERTA</span>
              <span>👨‍💼 {sesionActual.empleado.nombre}</span>
              <span>💰 ${sesionActual.montoApertura.toLocaleString()}</span>
            </div>
          ) : (
            <span className="status">🔴 CAJA CERRADA</span>
          )}
        </div>
      </header>

      <div className="caja-layout">
        {/* Panel apertura/cierre */}
        <div className="panel-apertura">
          {!sesionActual ? (
            <div className="card">
              <h3>🔓 Abrir Caja</h3>
              <div className="form-container">
                <select 
                  value={empleadoSeleccionado}
                  onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                  className="input"
                >
                  <option value="">Seleccionar empleado</option>
                  {empleados.filter(e => e.activo).map(empleado => (
                    <option key={empleado.id} value={empleado.id}>
                      {empleado.nombre} - {empleado.rol}
                    </option>
                  ))}
                </select>

                <input
                  type="password"
                  placeholder="PIN del empleado"
                  value={pinEmpleado}
                  onChange={(e) => setPinEmpleado(e.target.value)}
                  className="input"
                />

                <input
                  type="number"
                  placeholder="Monto inicial en caja"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  className="input"
                />

                <button className="button success" onClick={abrirCaja}>
                  🔓 Abrir Caja
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h3>🔒 Cerrar Caja</h3>
              <div className="resumen-cierre">
                <p><strong>Sesión:</strong> {sesionActual.empleado.nombre}</p>
                <p><strong>Apertura:</strong> {new Date(sesionActual.fechaApertura).toLocaleString()}</p>
                <p><strong>Monto inicial:</strong> ${sesionActual.montoApertura.toLocaleString()}</p>
              </div>
              <div className="acciones-caja">
                <button className="button" onClick={arquearCaja}>
                  📊 Arquear Caja
                </button>
                <button className="button danger" onClick={cerrarCaja}>
                  🔒 Cerrar Caja
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panel movimientos */}
        {sesionActual && (
          <div className="panel-movimientos">
            <div className="card">
              <h3>💰 Registrar Movimiento</h3>
              <div className="form-container">
                <select
                  value={nuevoMovimiento.tipo}
                  onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, tipo: e.target.value as any})}
                  className="input"
                >
                  <option value="ingreso">📈 Ingreso</option>
                  <option value="egreso">📉 Egreso</option>
                </select>

                <input
                  type="number"
                  placeholder="Monto"
                  value={nuevoMovimiento.monto}
                  onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, monto: e.target.value})}
                  className="input"
                />

                <input
                  type="text"
                  placeholder="Concepto del movimiento"
                  value={nuevoMovimiento.concepto}
                  onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, concepto: e.target.value})}
                  className="input"
                />

                <button className="button" onClick={registrarMovimiento}>
                  💾 Registrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel resumen del día */}
        {resumenDia && (
          <div className="panel-resumen">
            <div className="card">
              <h3>📊 Resumen del Día</h3>
              <div className="resumen-stats">
                <div className="stat-card">
                  <h4>🛒 Ventas</h4>
                  <p className="stat-value">${resumenDia.totalVentas?.toLocaleString() || '0'}</p>
                  <p className="stat-detail">{resumenDia.cantidadVentas || 0} transacciones</p>
                </div>

                <div className="stat-card">
                  <h4>💵 Efectivo</h4>
                  <p className="stat-value">${resumenDia.ventasEfectivo?.toLocaleString() || '0'}</p>
                </div>

                <div className="stat-card">
                  <h4>💳 Tarjetas</h4>
                  <p className="stat-value">${resumenDia.ventasTarjeta?.toLocaleString() || '0'}</p>
                </div>

                <div className="stat-card">
                  <h4>💰 En Caja</h4>
                  <p className="stat-value">${resumenDia.totalEnCaja?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de movimientos */}
        <div className="panel-historial">
          <div className="card">
            <h3>📋 Movimientos del Día</h3>
            <div className="movimientos-lista">
              {movimientos.map(movimiento => (
                <div key={movimiento.id} className={`movimiento-item ${movimiento.tipo}`}>
                  <div className="movimiento-info">
                    <span className="movimiento-concepto">{movimiento.concepto}</span>
                    <span className="movimiento-empleado">👨‍💼 {movimiento.empleado.nombre}</span>
                  </div>
                  <div className="movimiento-monto">
                    <span className={`monto ${movimiento.tipo}`}>
                      {movimiento.tipo === 'ingreso' ? '+' : '-'}${movimiento.monto.toLocaleString()}
                    </span>
                    <span className="movimiento-fecha">
                      {new Date(movimiento.fecha).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlCaja;