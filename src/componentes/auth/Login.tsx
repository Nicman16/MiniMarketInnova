import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getApiBase } from '../../services/shared/apiConfig';
import '../../styles/Login.css';

function Login() {
  const { login } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const activationToken = params.get('token') || '';
  const isActivationMode = window.location.pathname === '/activar' || !!activationToken;
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [confirmarContraseña, setConfirmarContraseña] = useState('');
  const [mensaje, setMensaje] = useState('');
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

  const handleActivacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);

    try {
      if (!activationToken) {
        throw new Error('Falta el token de activación');
      }

      if (!contraseña || contraseña.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      if (contraseña !== confirmarContraseña) {
        throw new Error('Las contraseñas no coinciden');
      }

      const response = await fetch(`${getApiBase()}/api/auth/activar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activationToken, contraseña })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo activar la cuenta');
      }

      setMensaje(data?.mensaje || 'Cuenta activada correctamente');
      setContraseña('');
      setConfirmarContraseña('');
      window.history.replaceState({}, document.title, '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar la cuenta');
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
          <h3>{isActivationMode ? 'Activar Cuenta' : 'Iniciar Sesión'}</h3>

          <div className="login-form">
            <form onSubmit={isActivationMode ? handleActivacion : handleSubmit}>
              {!isActivationMode && (
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
              )}

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

              {isActivationMode && (
                <div className="form-group">
                  <label htmlFor="confirmar-contraseña">🔐 Confirmar Contraseña</label>
                  <input
                    id="confirmar-contraseña"
                    type="password"
                    placeholder="••••••••"
                    value={confirmarContraseña}
                    onChange={(e) => setConfirmarContraseña(e.target.value)}
                    disabled={cargando}
                  />
                </div>
              )}

              {mensaje && <div className="success-message">✅ {mensaje}</div>}
              {error && <div className="error-message">⚠️ {error}</div>}

              <button
                type="submit"
                className="login-btn"
                disabled={cargando}
              >
                {cargando
                  ? isActivationMode ? '⏳ Activando Cuenta...' : '⏳ Iniciando Sesión...'
                  : isActivationMode ? '✅ Activar Cuenta' : '🚀 Iniciar Sesión'}
              </button>
            </form>
          </div>

          <div className="demo-accounts">
            <h4>{isActivationMode ? '📬 Activación por correo' : '🔐 Acceso por correo'}</h4>
            <p>
              {isActivationMode
                ? 'Define tu contraseña para terminar la activación de la cuenta.'
                : 'El acceso principal ahora se hace con correo y contraseña. Las cuentas nuevas se activan por correo.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;