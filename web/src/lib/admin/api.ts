'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, type AdminRole } from '@unibody/shared';
import { adminApi, adminToken } from '@/lib/api';

export { adminApi, adminToken };

/** Friendly message from anything thrown by the API client. */
export function errMsg(e: unknown, fallback = 'Something went wrong'): string {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error) return e.message === 'Failed to fetch' ? 'Can’t reach the server. Check your connection.' : e.message;
  return fallback;
}
/** Field errors returned by the API (zod `fields`). */
export const fieldErrors = (e: unknown): Record<string, string> => (e instanceof ApiError && e.fields ? e.fields : {});

export interface ApiState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** true only for the very first load (no data yet) */
  initial: boolean;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/**
 * Tiny data-fetching hook: runs `fn` whenever `deps` change, keeps the previous data while
 * refetching (no flashing skeletons), ignores stale responses, and exposes refetch/setData.
 */
export function useApi<T>(fn: () => Promise<T>, deps: React.DependencyList, opts: { enabled?: boolean } = {}): ApiState<T> {
  const enabled = opts.enabled ?? true;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const d = await fnRef.current();
      if (id !== seq.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if (id !== seq.current) return;
      if (e instanceof ApiError && e.status === 401) {
        window.dispatchEvent(new Event('pb-admin-unauthorized'));
      }
      setError(errMsg(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, error, loading, initial: loading && data === undefined, refetch: run, setData };
}

/** Wrap a mutation with busy state + toast-friendly error handling. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async <R,>(key: string, fn: () => Promise<R>): Promise<R | undefined> => {
    setBusy(key);
    try {
      return await fn();
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, run };
}

/** Debounce a changing value (search boxes). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ------------------------------------------------------------------ money
/** paise -> rupee string for inputs ("1499" or "1499.5") */
export const paiseToInput = (p: number | null | undefined): string => (p === null || p === undefined ? '' : String(p / 100));
/** rupee input -> paise (null when empty / invalid) */
export const inputToPaise = (s: string): number | null => {
  const t = s.replace(/[,₹\s]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

// ------------------------------------------------------------------ roles
/** What each role can do — mirrors the backend's requireAdmin() guards. */
export const PERMS = {
  dashboard: ['OWNER', 'MANAGER'],
  invoices: ['OWNER', 'MANAGER'],
  customers: ['OWNER', 'MANAGER'],
  leads: ['OWNER', 'MANAGER'],
  catalogEdit: ['OWNER', 'MANAGER'],
  productEdit: ['OWNER', 'MANAGER'],
  stockEdit: ['OWNER', 'MANAGER'],
  purchases: ['OWNER', 'MANAGER'],
  suppliers: ['OWNER', 'MANAGER'],
  coupons: ['OWNER', 'MANAGER'],
  reports: ['OWNER', 'MANAGER'],
  settingsView: ['OWNER', 'MANAGER'],
  settingsEdit: ['OWNER'],
  staff: ['OWNER'],
  cost: ['OWNER'],
  codCollect: ['OWNER', 'MANAGER'],
  invoiceGenerate: ['OWNER', 'MANAGER'],
} as const satisfies Record<string, readonly AdminRole[]>;
export type Perm = keyof typeof PERMS;
export const can = (role: AdminRole | undefined, perm: Perm) => !!role && (PERMS[perm] as readonly AdminRole[]).includes(role);

// ------------------------------------------------------------------ misc
export const waLink = (phone: string, text?: string) => {
  const d = phone.replace(/\D/g, '').slice(-10);
  return `https://wa.me/91${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
export const telLink = (phone: string) => `tel:+91${phone.replace(/\D/g, '').slice(-10)}`;
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
/** yyyy-mm-dd in IST */
export const isoDay = (d: Date) => new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
export const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86400000));

/** ₹1.2Cr / ₹4.5L / ₹12K — for chart axes and tight spaces. */
export function inrCompact(paise: number): string {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(r >= 1e8 ? 0 : 1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(r >= 1e6 ? 0 : 1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(r >= 1e4 ? 0 : 1)}K`;
  return `₹${Math.round(r)}`;
}
export function greeting(d = new Date()): string {
  const h = Number(d.toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
