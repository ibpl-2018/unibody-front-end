'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_STATUS_LABEL, type AdminUserDTO, type OrderLiveEvent } from '@unibody/shared';
import { useToast } from '@/components/ui/toast';
import { adminApi, adminToken, can, type Perm } from './api';

export interface AdminNotification {
  id: string;
  orderNo: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
}
export interface NavCounts {
  ordersToAct: number;
  openLeads: number;
  lowStock: number;
  /** pending approvals + open security alerts (Super Admin) */
  security: number;
}
export type LiveState = 'connecting' | 'live' | 'offline';

interface Ctx {
  user: AdminUserDTO;
  token: string;
  can: (p: Perm) => boolean;
  logout: () => void;
  /** increments on every live event — pages depend on it to refetch */
  liveVersion: number;
  live: LiveState;
  notifications: AdminNotification[];
  markAllRead: () => void;
  counts: NavCounts;
  refreshCounts: () => void;
  days: 7 | 30 | 90;
  setDays: (d: 7 | 30 | 90) => void;
}

const SessionCtx = createContext<Ctx | null>(null);

export function useAdmin(): Ctx {
  const c = useContext(SessionCtx);
  if (!c) throw new Error('useAdmin must be used inside <AdminSession>');
  return c;
}
/** Call `fn` whenever a live order event arrives. */
export function useLiveRefetch(fn: () => void) {
  const { liveVersion } = useAdmin();
  const first = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    fnRef.current();
  }, [liveVersion]);
}

const DAYS_KEY = 'pb.admin.days';

/**
 * Auth guard + session state for the admin panel: verifies the token with /me, keeps the
 * nav badge counts fresh, and listens to the admin SSE stream for live order events.
 */
export function AdminSession({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [user, setUser] = useState<AdminUserDTO | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [liveVersion, setLiveVersion] = useState(0);
  const [live, setLive] = useState<LiveState>('connecting');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [counts, setCounts] = useState<NavCounts>({ ordersToAct: 0, openLeads: 0, lowStock: 0, security: 0 });
  const [days, setDaysState] = useState<7 | 30 | 90>(30);

  const logout = useCallback(() => {
    adminToken.set(null);
    setUser(null);
    router.replace('/admin/login');
  }, [router]);

  // --- auth
  useEffect(() => {
    const t = adminToken.get();
    if (!t) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setToken(t);
    adminApi.admin
      .me()
      .then(setUser)
      .catch(() => {
        adminToken.set(null);
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      });
    try {
      const d = Number(localStorage.getItem(DAYS_KEY));
      if (d === 7 || d === 30 || d === 90) setDaysState(d);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = () => {
      toast('Your session expired — please sign in again', 'error');
      logout();
    };
    window.addEventListener('pb-admin-unauthorized', on);
    return () => window.removeEventListener('pb-admin-unauthorized', on);
  }, [logout, toast]);

  const setDays = useCallback((d: 7 | 30 | 90) => {
    setDaysState(d);
    try {
      localStorage.setItem(DAYS_KEY, String(d));
    } catch {}
  }, []);

  // --- nav counts
  const refreshCounts = useCallback(() => {
    if (!user) return;
    const role = user.role;
    adminApi.admin
      .orders({ pageSize: 1 })
      .then((r) => setCounts((c) => ({ ...c, ordersToAct: (r.counts.NEW ?? 0) + (r.counts.CONFIRMED ?? 0) + (r.counts.PACKED ?? 0) })))
      .catch(() => {});
    adminApi.admin
      .inventory({ pageSize: 1 })
      .then((r) => setCounts((c) => ({ ...c, lowStock: r.summary.lowStock })))
      .catch(() => {});
    if (can(role, 'security'))
      Promise.all([adminApi.admin.approvals({ status: 'PENDING' }), adminApi.admin.securityAlerts({ status: 'OPEN' })])
        .then(([a, s]) => setCounts((c) => ({ ...c, security: a.total + s.total })))
        .catch(() => {});
    if (can(role, 'leads'))
      adminApi.admin
        .leads({})
        .then((r) => setCounts((c) => ({ ...c, openLeads: r.summary.open })))
        .catch(() => {});
  }, [user]);

  useEffect(() => {
    refreshCounts();
    const t = setInterval(refreshCounts, 60_000);
    return () => clearInterval(t);
  }, [refreshCounts]);

  // --- live events (SSE)
  useEffect(() => {
    if (!user || !token) return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    const connect = () => {
      setLive('connecting');
      es = new EventSource(adminApi.admin.eventsUrl(token));
      es.addEventListener('ready', () => setLive('live'));
      es.addEventListener('order', (m) => {
        let e: OrderLiveEvent;
        try {
          e = JSON.parse((m as MessageEvent<string>).data) as OrderLiveEvent;
        } catch {
          return;
        }
        const title =
          e.type === 'order.created' ? 'New order' : e.type === 'order.updated' ? 'Order updated' : `Order ${ADMIN_STATUS_LABEL[e.status].toLowerCase()}`;
        const body = e.type === 'order.created' ? `${e.orderNo} just came in` : `${e.orderNo} · ${ADMIN_STATUS_LABEL[e.status]}`;
        setNotifications((n) => [{ id: `${e.orderNo}-${e.at}-${e.type}`, orderNo: e.orderNo, title, body, at: e.at, read: false }, ...n].slice(0, 30));
        if (e.type !== 'order.updated') toast(`${title} · ${e.orderNo}`, 'info');
        setLiveVersion((v) => v + 1);
        refreshCounts();
      });
      es.onerror = () => {
        setLive('offline');
        es?.close();
        if (!closed) retry = setTimeout(connect, 5000);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      es?.close();
    };
  }, [user, token, toast, refreshCounts]);

  const markAllRead = useCallback(() => setNotifications((n) => n.map((x) => ({ ...x, read: true }))), []);

  if (!user || !token) return <>{fallback}</>;
  return (
    <SessionCtx.Provider
      value={{ user, token, can: (p) => can(user.role, p), logout, liveVersion, live, notifications, markAllRead, counts, refreshCounts, days, setDays }}
    >
      {children}
    </SessionCtx.Provider>
  );
}
