/** Safe JSON localStorage helpers — every access is wrapped because storage can be blocked (private mode, SSR). */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export const KEYS = {
  cart: 'pb.cart',
  device: 'pb.mydevice',
  recentOrders: 'pb.recentOrders',
  customer: 'pb.customer',
} as const;
