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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏪 MiniMarket Innova</h1>
          <p>Sistema de Gestión</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">📧 Email</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
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
            className="login-button"
            disabled={cargando}
          >
            {cargando ? '⏳ Iniciando...' : '🚀 Iniciar Sesión'}
          </button>
        </form>

        <div className="login-footer">
          <p className="demo-hint">
            💡 Demo: prueba con jefe@test.com / 1234 o empleado@test.com / 1234
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;