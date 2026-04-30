import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Usuario, LoginResponse } from '../types/pos.types';
import { getApiBase } from '../services/shared/apiConfig';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  login: (email: string, contraseña: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isJefe: boolean;
  isEmpleado: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Cargar sesión guardada al montar
  useEffect(() => {
    const tokenGuardado = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');
    
    if (tokenGuardado && usuarioGuardado) {
      try {
        const usuarioParsed = JSON.parse(usuarioGuardado);
        setToken(tokenGuardado);
        setUsuario(usuarioParsed);
      } catch (error) {
        console.error('Error cargando sesión:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      }
    }
  }, []);

  const login = async (email: string, contraseña: string) => {
    try {
      const response = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, contraseña })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error(`Status: ${response.status}, Error:`, error);
        throw new Error(`Credenciales inválidas (${response.status}): ${error.error || 'Error desconocido'}`);
      }

      const data: LoginResponse = await response.json();
      setToken(data.token);
      setUsuario(data.usuario);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
    } catch (error) {
      throw new Error('Error al iniciar sesión: ' + (error instanceof Error ? error.message : 'Desconocido'));
    }
  };

  const logout = () => {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  };

  const value: AuthContextType = {
    usuario,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!usuario,
    isJefe: usuario?.rol === 'jefe',
    isEmpleado: usuario?.rol === 'empleado'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
