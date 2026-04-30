// URL base del backend.
// En local usa el proxy; en produccion usa REACT_APP_API_URL.
export const getApiBase = (): string =>
  (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
