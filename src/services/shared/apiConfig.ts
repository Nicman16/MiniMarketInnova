import axios from 'axios';

const RAILWAY_BASE_URL = 'https://minimarketinnova-production.up.railway.app';

const stripQuotes = (value: string): string => value.replace(/^['\"]+|['\"]+$/g, '');

const ensureProtocol = (value: string): string => {
  if (!value) return value;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const normalizeBaseUrl = (value: string): string => {
  const withoutQuotes = stripQuotes(value.trim());
  if (!withoutQuotes) return RAILWAY_BASE_URL;

  const withProtocol = ensureProtocol(withoutQuotes);

  try {
    const parsed = new URL(withProtocol);
    const cleanPath = parsed.pathname.replace(/\/+$/, '').replace(/\/api$/i, '');
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return RAILWAY_BASE_URL;
  }
};

export const getApiBase = (): string => normalizeBaseUrl(process.env.REACT_APP_API_URL || RAILWAY_BASE_URL);

export const buildApiUrl = (pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${getApiBase()}${path}`;
};

export const apiClient = axios.create({
  baseURL: getApiBase(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
