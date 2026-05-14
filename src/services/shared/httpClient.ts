import { buildApiUrl } from './apiConfig';

const buildCandidates = (pathOrUrl: string): string[] => {
  return [buildApiUrl(pathOrUrl)];
};

const looksLikeJson = (raw: string): boolean => {
  const text = raw.trim();
  return text.startsWith('{') || text.startsWith('[');
};

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchApiJson<T = unknown>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  const candidates = buildCandidates(pathOrUrl);
  const errors: string[] = [];
  const authHeaders = getAuthHeaders();

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        cache: 'no-store',
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(init?.headers || {})
        }
      });

      if (!response.ok) {
        errors.push(`${candidate}: HTTP ${response.status}`);
        if (response.status === 404 && candidates.length > 1) continue;
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const raw = await response.text();
      const treatAsJson = contentType.includes('application/json') || looksLikeJson(raw);

      if (!treatAsJson) {
        errors.push(`${candidate}: respuesta no JSON (${contentType || 'sin content-type'})`);
        if (candidates.length > 1) continue;
        throw new Error(`Respuesta no JSON (${contentType || 'sin content-type'})`);
      }

      try {
        return JSON.parse(raw) as T;
      } catch {
        errors.push(`${candidate}: JSON inválido`);
        if (candidates.length > 1) continue;
        throw new Error('Respuesta JSON inválida');
      }
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`No fue posible obtener JSON desde API. ${errors.join(' | ')}`);
}
