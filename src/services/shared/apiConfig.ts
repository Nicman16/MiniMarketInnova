import axios from 'axios';

const BASE_URL = 'https://minimarketinnova-production.up.railway.app';

/** Instancia de Axios con baseURL fija y token automático en cada petición. */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/** Retrocompatibilidad: URL base sin barra final. */
export const getApiBase = (): string => BASE_URL;
