// src/componentes/Empleados.tsx
import React, { useState, useEffect } from 'react';
import '../styles/Empleados.css';
import { authService } from '../services/authService';
import { Empleado } from '../types/pos.types';

function Empleados() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: '',
    email: '',
    rol: 'vendedor' as 'admin' | 'vendedor' | 'supervisor',
    pin: ''
  });
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [empleadoActual, setEmpleadoActual] = useState<Empleado | null>(null);

  useEffect(() => {
    cargarEmpleados();
    cargarEmpleadoActual();
  }, []);

  const cargarEmpleados = async () => {
    try {
      const empleadosData = await authService.obtenerEmpleados();
      setEmpleados(empleadosData);
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  };

  const cargarEmpleadoActual = async () => {
    try {
      const empleado = await authService.obtenerEmpleadoActual();
      setEmpleadoActual(empleado);
    } catch (error) {
      console.error('Error cargando empleado actual:', error);
    }
  };

  const crearEmpleado = async () => {
    if (!nuevoEmpleado.nombre || !nuevoEmpleado.email || !nuevoEmpleado.pin) {
      alert('Complete todos los campos obligatorios');
      return;
    }

    if (nuevoEmpleado.pin.length < 4) {
      alert('El PIN debe tener al menos 4 dígitos');
      return;
    }

    try {
      const empleado = await authService.crearEmpleado(nuevoEmpleado);
      setEmpleados([...empleados, empleado]);
      setNuevoEmpleado({ nombre: '', email: '', rol: 'vendedor', pin: '' });
      setModalAbierto(false);
      alert('✅ Empleado creado correctamente');
    } catch (error: any) {
      alert('Error al crear empleado: ' + error.message);
    }
  };

  const editarEmpleado = async () => {
    if (!empleadoEditando) return;

    try {
      const empleadoActualizado = await authService.actualizarEmpleado(empleadoEditando);
      setEmpleados(empleados.map(e => e.id === empleadoEditando.id ? empleadoActualizado : e));
      setEmpleadoEditando(null);
      setModalAbierto(false);
      alert('✅ Empleado actualizado correctamente');
    } catch (error: any) {
      alert('Error al actualizar empleado: ' + error.message);
    }
  };

  const toggleEstadoEmpleado = async (empleado: Empleado) => {
    try {
      const empleadoActualizado = await authService.toggleEstadoEmpleado(empleado.id);
      setEmpleados(empleados.map(e => e.id === empleado.id ? empleadoActualizado : e));
      alert(`✅ Empleado ${empleadoActualizado.activo ? 'activado' : 'desactivado'}`);
    } catch (error: any) {
      alert('Error al cambiar estado: ' + error.message);
    }
  };

  const eliminarEmpleado = async (empleado: Empleado) => {
    if (empleado.id === empleadoActual?.id) {
      alert('No puedes eliminar tu propio usuario');
      return;
    }

    const confirmar = window.confirm(`¿Estás seguro de eliminar a ${empleado.nombre}?`);
    if (!confirmar) return;

    try {
      await authService.eliminarEmpleado(empleado.id);
      setEmpleados(empleados.filter(e => e.id !== empleado.id));
      alert('✅ Empleado eliminado');
    } catch (error: any) {
      alert('Error al eliminar empleado: ' + error.message);
    }
  };

  const abrirModalNuevo = () => {
    setNuevoEmpleado({ nombre: '', email: '', rol: 'vendedor', pin: '' });
    setEmpleadoEditando(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (empleado: Empleado) => {
    setEmpleadoEditando({ ...empleado });
    setNuevoEmpleado({ nombre: '', email: '', rol: 'vendedor', pin: '' });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEmpleadoEditando(null);
    setNuevoEmpleado({ nombre: '', email: '', rol: 'vendedor', pin: '' });
  };

  const generarPinAleatorio = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    if (empleadoEditando) {
      setEmpleadoEditando({ ...empleadoEditando, pin });
    } else {
      setNuevoEmpleado({ ...nuevoEmpleado, pin });
    }
  };

  const puedeEditar = empleadoActual?.rol === 'admin';

  return (
    <div className="empleados-container">
      <header className="empleados-header">
        <h1>👨‍💼 Gestión de Empleados</h1>
        {puedeEditar && (
          <button className="button success" onClick={abrirModalNuevo}>
            ➕ Nuevo Empleado
          </button>
        )}
      </header>

      <div className="empleados-stats">
        <div className="stat-card">
          <h3>👥 Total Empleados</h3>
          <p className="stat-value">{empleados.length}</p>
        </div>
        <div className="stat-card">
          <h3>🟢 Activos</h3>
          <p className="stat-value">{empleados.filter(e => e.activo).length}</p>
        </div>
        <div className="stat-card">
          <h3>👑 Administradores</h3>
          <p className="stat-value">{empleados.filter(e => e.rol === 'admin').length}</p>
        </div>
        <div className="stat-card">
          <h3>🛒 Vendedores</h3>
          <p className="stat-value">{empleados.filter(e => e.rol === 'vendedor').length}</p>
        </div>
      </div>

      <div className="empleados-grid">
        {empleados.map(empleado => (
          <div key={empleado.id} className={`empleado-card ${!empleado.activo ? 'inactivo' : ''}`}>
            <div className="empleado-avatar">
              {empleado.nombre.charAt(0).toUpperCase()}
            </div>
            
            <div className="empleado-info">
              <h3>{empleado.nombre}</h3>
              <p className="empleado-email">{empleado.email}</p>
              <div className="empleado-badges">
                <span className={`badge ${empleado.rol}`}>
                  {empleado.rol === 'admin' ? '👑 Admin' : 
                   empleado.rol === 'supervisor' ? '🔧 Supervisor' : '🛒 Vendedor'}
                </span>
                <span className={`badge ${empleado.activo ? 'activo' : 'inactivo'}`}>
                  {empleado.activo ? '🟢 Activo' : '🔴 Inactivo'}
                </span>
              </div>
            </div>

            {puedeEditar && (
              <div className="empleado-acciones">
                <button 
                  className="button small"
                  onClick={() => abrirModalEditar(empleado)}
                >
                  ✏️ Editar
                </button>
                <button 
                  className={`button small ${empleado.activo ? 'warning' : 'success'}`}
                  onClick={() => toggleEstadoEmpleado(empleado)}
                >
                  {empleado.activo ? '⏸️ Desactivar' : '▶️ Activar'}
                </button>
                {empleado.id !== empleadoActual?.id && (
                  <button 
                    className="button small danger"
                    onClick={() => eliminarEmpleado(empleado)}
                  >
                    🗑️ Eliminar
                  </button>
                )}
              </div>
            )}

            <div className="empleado-stats">
              <p><strong>PIN:</strong> ●●●●</p>
              <p><strong>Creado:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para crear/editar empleado */}
      {modalAbierto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {empleadoEditando ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}
              </h3>
              <button className="close-button" onClick={cerrarModal}>❌</button>
            </div>

            <div className="modal-body">
              <div className="form-container">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={empleadoEditando ? empleadoEditando.nombre : nuevoEmpleado.nombre}
                  onChange={(e) => empleadoEditando 
                    ? setEmpleadoEditando({...empleadoEditando, nombre: e.target.value})
                    : setNuevoEmpleado({...nuevoEmpleado, nombre: e.target.value})
                  }
                  className="input"
                />

                <input
                  type="email"
                  placeholder="Email"
                  value={empleadoEditando ? empleadoEditando.email : nuevoEmpleado.email}
                  onChange={(e) => empleadoEditando 
                    ? setEmpleadoEditando({...empleadoEditando, email: e.target.value})
                    : setNuevoEmpleado({...nuevoEmpleado, email: e.target.value})
                  }
                  className="input"
                />

                <select
                  value={empleadoEditando ? empleadoEditando.rol : nuevoEmpleado.rol}
                  onChange={(e) => empleadoEditando 
                    ? setEmpleadoEditando({...empleadoEditando, rol: e.target.value as any})
                    : setNuevoEmpleado({...nuevoEmpleado, rol: e.target.value as any})
                  }
                  className="input"
                >
                  <option value="vendedor">🛒 Vendedor</option>
                  <option value="supervisor">🔧 Supervisor</option>
                  <option value="admin">👑 Administrador</option>
                </select>

                <div className="pin-container">
                  <input
                    type="text"
                    placeholder="PIN (4 dígitos)"
                    value={empleadoEditando ? empleadoEditando.pin || '' : nuevoEmpleado.pin}
                    onChange={(e) => {
                      const pin = e.target.value.replace(/\D/g, '').slice(0, 4);
                      empleadoEditando 
                        ? setEmpleadoEditando({...empleadoEditando, pin})
                        : setNuevoEmpleado({...nuevoEmpleado, pin});
                    }}
                    className="input"
                    maxLength={4}
                  />
                  <button 
                    type="button"
                    className="button small"
                    onClick={generarPinAleatorio}
                  >
                    🎲 Generar
                  </button>
                </div>

                <div className="permisos-info">
                  <h4>📋 Permisos por rol:</h4>
                  <ul>
                    <li><strong>🛒 Vendedor:</strong> Ventas, consultar inventario</li>
                    <li><strong>🔧 Supervisor:</strong> Vendedor + gestión inventario + reportes</li>
                    <li><strong>👑 Admin:</strong> Acceso completo + gestión empleados</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="button" onClick={cerrarModal}>
                ❌ Cancelar
              </button>
              <button 
                className="button success"
                onClick={empleadoEditando ? editarEmpleado : crearEmpleado}
              >
                {empleadoEditando ? '💾 Actualizar' : '➕ Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Empleados;