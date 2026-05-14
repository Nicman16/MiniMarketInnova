import { apiClient } from './apiConfig';

/**
 * Wrapper sobre apiClient para mantener compatibilidad con los servicios
 * que llaman fetchApiJson(path, { method, headers, body }).
 * El token se adjunta automáticamente via interceptor en apiClient.
 */
export async function fetchApiJson<T = unknown>(
  pathOrUrl: string,
  init?: RequestInit
): Promise<T> {
  const method = ((init?.method ?? 'GET') as string).toUpperCase();

  let data: unknown;
  if (init?.body && typeof init.body === 'string') {
    try { data = JSON.parse(init.body); } catch { data = init.body; }
  }

  const response = await apiClient.request<T>({
    url: pathOrUrl,
    method,
    ...(data !== undefined ? { data } : {})
  });

  return response.data;
}
