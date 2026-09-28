import 'server-only';
import { createApiClient, ApiError } from '@unibody/shared';
import { SERVER_API_URL } from './config';

/**
 * API client for Server Components / route handlers (public storefront data only).
 * Responses are revalidated every 30s so the catalogue stays fresh without hammering the API.
 */
export const serverApi = createApiClient({
  baseUrl: SERVER_API_URL,
  fetch: ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, next: { revalidate: 30 } } as RequestInit)) as typeof fetch,
});

/** Returns null instead of throwing on 404 so pages can call notFound(). */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
