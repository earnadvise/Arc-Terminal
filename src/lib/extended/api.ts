import { EXTENDED_PROXY_BASE } from './config';

export interface ExtendedEnvelope<T> {
  status: 'OK' | 'ERROR';
  data?: T;
  error?: { code?: number; message?: string };
}

export class ExtendedError extends Error {
  constructor(message: string, public httpStatus: number) {
    super(message);
    this.name = 'ExtendedError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  apiKey?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

/** Call Extended through our same-origin proxy. Never sends secrets other than the user's own API key. */
export async function extendedRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', apiKey, headers = {}, body, query } = options;
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const url = `${EXTENDED_PROXY_BASE}${path}${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: ExtendedEnvelope<T> | undefined;
  try {
    parsed = text ? (JSON.parse(text) as ExtendedEnvelope<T>) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!res.ok || parsed?.status === 'ERROR') {
    const message = parsed?.error?.message || text.slice(0, 200) || `Extended request failed (${res.status})`;
    throw new ExtendedError(message, res.status);
  }
  return (parsed?.data ?? (parsed as unknown as T)) as T;
}
