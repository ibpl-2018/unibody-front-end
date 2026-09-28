import { ApiError, createApiClient } from '@/shared';
import { API_URL } from './config';

let customerToken: string | null = null;
/** Set by the session provider whenever the OTP token changes. */
export const setApiToken = (t: string | null) => {
  customerToken = t;
};

export const api = createApiClient({ baseUrl: API_URL, getToken: () => customerToken });

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof TypeError) return 'Can’t reach Unibody right now. Check your connection and try again.';
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export { ApiError };
