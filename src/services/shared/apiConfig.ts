// URL base del backend.
// En local usa el proxy; en produccion usa REACT_APP_API_URL.
export const getApiBase = (): string => {
  const raw = (process.env.REACT_APP_API_URL || '').trim().replace(/\/$/, '');

  // Evita rutas duplicadas como /api/api/auth/login cuando la variable ya termina en /api.
  if (/\/api$/i.test(raw)) {
    return raw.replace(/\/api$/i, '');
  }

  return raw;
};
