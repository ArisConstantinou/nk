import type {ApiFailure} from './types';

let csrfToken = '';
let unauthorizedHandler: (() => void) | null = null;

export class AdminApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;

  constructor(status: number, failure: ApiFailure) {
    super(failure.message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = failure.code;
    this.fields = failure.fields || {};
  }
}

export const setCsrfToken = (token: string) => { csrfToken = token; };
export const setUnauthorizedHandler = (handler: (() => void) | null) => { unauthorizedHandler = handler; };

export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method || 'GET';
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD'].includes(method.toUpperCase()) && csrfToken) headers.set('X-CSRF-Token', csrfToken);
  let response: Response;
  try {
    response = await fetch(`/api/admin${path}`, {...init, headers, credentials: 'same-origin'});
  } catch {
    throw new AdminApiError(0, {code: 'service_unavailable', message: 'The secure admin service is not running. Start it with npm run dev:admin.'});
  }
  const payload = await response.json().catch(() => ({}));
  if (payload && typeof payload === 'object' && typeof payload.csrfToken === 'string') setCsrfToken(payload.csrfToken);
  if (!response.ok) {
    if (response.status === 401) {
      csrfToken = '';
      unauthorizedHandler?.();
    }
    throw new AdminApiError(response.status, payload.error || {code: 'request_failed', message: 'The request could not be completed.'});
  }
  return payload as T;
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.';
