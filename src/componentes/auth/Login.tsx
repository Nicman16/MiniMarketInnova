import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Login.css';

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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏪</div>
          <h1>MiniMarket Innova</h1>
          <p>Sistema de Gestión Avanzado</p>
        </div>

        <div className="login-body">
          <h3>Iniciar Sesión</h3>

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
            <h4>💡 Entorno de Demostración</h4>
            <p>
              Ejecuta <strong>npm run seed:demo</strong> en desarrollo para crear usuarios demo.<br/>
              Después inicia sesión manualmente con las cuentas generadas por el script.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;