import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      if (!email || !contraseña) {
        throw new Error('Completa usuario y contraseña');
      }

      await login(email, contraseña);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPassword: string) => {
    setError('');
    setCargando(true);

    try {
      await login(userEmail, userPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  const empleadosDemo = [
    {
      nombre: 'Carlos Rodríguez',
      email: 'jefe@test.com',
      password: '1234',
      rol: 'Administrador',
      avatar: '👑'
    },
    {
      nombre: 'María González',
      email: 'empleado@test.com',
      password: '1234',
      rol: 'Empleado',
      avatar: '👤'
    }
  ];

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏪</div>
          <h1>MiniMarket Innova</h1>
          <p>Sistema de Gestión Avanzado</p>
        </div>

        <div className="login-body">
          <h3>Acceso Rápido</h3>

          <div className="empleados-login">
            {empleadosDemo.map((empleado, index) => (
              <button
                key={index}
                className="empleado-btn"
                onClick={() => handleQuickLogin(empleado.email, empleado.password)}
                disabled={cargando}
              >
                <div className="empleado-avatar">
                  {empleado.avatar}
                </div>
                <div className="empleado-info">
                  <span className="nombre">{empleado.nombre}</span>
                  <span className="rol">{empleado.rol}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="login-form">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">📧 Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  placeholder="usuario@minimarket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="contraseña">🔐 Contraseña</label>
                <input
                  id="contraseña"
                  type="password"
                  placeholder="••••••••"
                  value={contraseña}
                  onChange={(e) => setContraseña(e.target.value)}
                  disabled={cargando}
                />
              </div>

              {error && <div className="error-message">⚠️ {error}</div>}

              <button
                type="submit"
                className="login-btn"
                disabled={cargando}
              >
                {cargando ? '⏳ Iniciando Sesión...' : '🚀 Iniciar Sesión'}
              </button>
            </form>
          </div>

          <div className="demo-accounts">
            <h4>💡 Cuentas de Demostración</h4>
            <p>
              <strong>Jefe:</strong> jefe@test.com / 1234<br/>
              <strong>Empleado:</strong> empleado@test.com / 1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;