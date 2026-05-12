// URL base del backend.
// En local usa el proxy; en produccion usa REACT_APP_API_URL.
export const getApiBase = (): string => {
  const rawInput = (process.env.REACT_APP_API_URL || '').trim();
  const withoutQuotes = rawInput.replace(/^['\"]+|['\"]+$/g, '');
  const raw = withoutQuotes.replace(/\/$/, '');

  // Evita rutas duplicadas como /api/api/auth/login cuando la variable ya termina en /api.
  if (/\/api$/i.test(raw)) {
    return raw.replace(/\/api$/i, '');
  }

  return raw;
};
