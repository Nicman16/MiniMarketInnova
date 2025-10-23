// src/componentes/Login.tsx
import React, { useState, useEffect } from 'react';
import '../styles/Login.css';
import { authService } from '../services/authService';

interface LoginProps {
  onLogin: (empleado: any) => void;
}

function Login({ onLogin }: LoginProps) {
  const [pin, setPin] = useState('');
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const cargarEmpleados = async () => {
    try {
      const empleadosData = await authService.obtenerEmpleadosActivos();
      setEmpleados(empleadosData);
    } catch (error) {
      setError('Error cargando empleados');
    }
  };

  const manejarLogin = async (empleadoId: string) => {
    if (!pin || pin.length < 4) {
      setError('Ingrese su PIN de 4 dígitos');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const empleado = await authService.login(empleadoId, pin);
      onLogin(empleado);
    } catch (error: any) {
      setError(error.message || 'PIN incorrecto');
    } finally {
      setCargando(false);
    }
  };

  const agregarDigito = (digito: string) => {
    if (pin.length < 4) {
      setPin(pin + digito);
    }
  };

  const borrarDigito = () => {
    setPin(pin.slice(0, -1));
  };

  const limpiarPin = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏪 MiniMarket Innova</h1>
          <h2>Sistema POS</h2>
        </div>

        <div className="login-body">
          <h3>👨‍💼 Seleccionar Empleado</h3>
          
          <div className="empleados-login">
            {empleados.map(empleado => (
              <button
                key={empleado.id}
                className="empleado-btn"
                onClick={() => manejarLogin(empleado.id)}
                disabled={cargando || pin.length < 4}
              >
                <div className="empleado-avatar">
                  {empleado.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="empleado-info">
                  <span className="nombre">{empleado.nombre}</span>
                  <span className="rol">
                    {empleado.rol === 'admin' ? '👑 Admin' : 
                     empleado.rol === 'supervisor' ? '🔧 Supervisor' : '🛒 Vendedor'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="pin-section">
            <h4>🔐 Ingrese su PIN</h4>
            
            <div className="pin-display">
              {Array(4).fill(0).map((_, index) => (
                <div key={index} className={`pin-dot ${pin.length > index ? 'filled' : ''}`}>
                  {pin.length > index ? '●' : '○'}
                </div>
              ))}
            </div>

            <div className="teclado-numerico">
              {Array.from({length: 9}, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  className="tecla-numero"
                  onClick={() => agregarDigito(num.toString())}
                  disabled={pin.length >= 4}
                >
                  {num}
                </button>
              ))}
              
              <button 
                className="tecla-numero"
                onClick={limpiarPin}
              >
                🗑️
              </button>
              
              <button
                className="tecla-numero"
                onClick={() => agregarDigito('0')}
                disabled={pin.length >= 4}
              >
                0
              </button>
              
              <button 
                className="tecla-numero"
                onClick={borrarDigito}
              >
                ⬅️
              </button>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {cargando && (
              <div className="loading-message">
                🔄 Verificando credenciales...
              </div>
            )}
          </div>

          <div className="login-footer">
            <p>🕐 {new Date().toLocaleString()}</p>
            <p>Versión 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;