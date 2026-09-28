'use client';
import { createApiClient } from '@unibody/shared';
import { PUBLIC_API_URL } from './config';

const CUSTOMER_TOKEN = 'pb.customer.token';
const ADMIN_TOKEN = 'pb.admin.token';

function read(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export const customerToken = {
  get: () => read(CUSTOMER_TOKEN),
  set: (t: string | null) => write(CUSTOMER_TOKEN, t),
};
export const adminToken = {
  get: () => read(ADMIN_TOKEN),
  set: (t: string | null) => write(ADMIN_TOKEN, t),
};

/** Storefront client — sends the customer's OTP token when present. */
export const api = createApiClient({ baseUrl: PUBLIC_API_URL, getToken: customerToken.get });
/** Admin client — sends the staff token. */
export const adminApi = createApiClient({ baseUrl: PUBLIC_API_URL, getToken: adminToken.get });
