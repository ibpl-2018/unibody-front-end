import { KEYS, readJSON, writeJSON } from './storage';

export interface RecentOrder {
  orderNo: string;
  phone: string;
  at: string;
  status?: string;
  total?: number;
}

export const getRecentOrders = (): RecentOrder[] => {
  const v = readJSON<RecentOrder[]>(KEYS.recentOrders, []);
  return Array.isArray(v) ? v.filter((o) => o && o.orderNo && o.phone) : [];
};

export function rememberOrder(o: Omit<RecentOrder, 'at'>) {
  const rest = getRecentOrders().filter((x) => x.orderNo !== o.orderNo);
  writeJSON(KEYS.recentOrders, [{ ...o, at: new Date().toISOString() }, ...rest].slice(0, 6));
}

export function forgetOrder(orderNo: string) {
  writeJSON(
    KEYS.recentOrders,
    getRecentOrders().filter((x) => x.orderNo !== orderNo),
  );
}

export const trackHref = (orderNo: string, phone: string) => `/track/${encodeURIComponent(orderNo)}?phone=${encodeURIComponent(phone)}`;
