import { getApiBase } from './apiConfig';

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const normalizePath = (value: string): string => {
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
};

const buildCandidates = (pathOrUrl: string): string[] => {
  if (isAbsoluteUrl(pathOrUrl)) return [pathOrUrl];

  const path = normalizePath(pathOrUrl);
  const base = getApiBase();
  const candidates: string[] = [];

  if (base) {
    candidates.push(`${base}${path}`);
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    candidates.push(`${window.location.origin}${path}`);
  }

  candidates.push(path);

  return candidates.filter((candidate, index, arr) => arr.indexOf(candidate) === index);
};

const looksLikeJson = (raw: string): boolean => {
  const text = raw.trim();
  return text.startsWith('{') || text.startsWith('[');
};

export async function fetchApiJson<T = unknown>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  const candidates = buildCandidates(pathOrUrl);
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: 'no-store', ...init });

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
