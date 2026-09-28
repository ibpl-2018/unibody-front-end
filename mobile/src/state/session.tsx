import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setApiToken } from '@/lib/api';
import { KEYS, loadRaw, saveJSON } from '@/lib/storage';
import type { AddressDTO } from '@/shared';

export interface Session {
  token: string;
  phone: string;
  name: string | null;
  addresses: (AddressDTO & { id: string })[];
  /** ms epoch */
  verifiedAt: number;
}

export interface RecentOrder {
  orderNo: string;
  phone: string;
  at: number;
  total?: number;
  status?: string;
}

interface SessionCtx {
  ready: boolean;
  session: Session | null;
  signIn: (s: Omit<Session, 'verifiedAt'>) => void;
  signOut: () => void;
  recentOrders: RecentOrder[];
  rememberOrder: (o: Omit<RecentOrder, 'at'>) => void;
  forgetOrder: (orderNo: string) => void;
  phoneFor: (orderNo: string) => string | null;
  recentSearches: string[];
  addSearch: (q: string) => void;
  clearSearches: () => void;
}

const Ctx = createContext<SessionCtx | null>(null);
// OTP tokens are short-lived on the API; treat anything older than 25 days as expired locally.
const MAX_AGE = 25 * 24 * 3600 * 1000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [recentOrders, setRecent] = useState<RecentOrder[]>([]);
  const [recentSearches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([loadRaw<Session>(KEYS.session), loadRaw<RecentOrder[]>(KEYS.recentOrders), loadRaw<string[]>(KEYS.recentSearches)]).then(([s, r, q]) => {
      if (s?.token && Date.now() - (s.verifiedAt ?? 0) < MAX_AGE) {
        setSession(s);
        setApiToken(s.token);
      }
      setRecent(Array.isArray(r) ? r : []);
      setSearches(Array.isArray(q) ? q : []);
      setReady(true);
    });
  }, []);

  const signIn = useCallback((s: Omit<Session, 'verifiedAt'>) => {
    const full = { ...s, verifiedAt: Date.now() };
    setSession(full);
    setApiToken(full.token);
    saveJSON(KEYS.session, full);
  }, []);
  const signOut = useCallback(() => {
    setSession(null);
    setApiToken(null);
    saveJSON(KEYS.session, null);
  }, []);

  const rememberOrder = useCallback((o: Omit<RecentOrder, 'at'>) => {
    setRecent((list) => {
      const next = [{ ...o, at: Date.now() }, ...list.filter((x) => x.orderNo !== o.orderNo)].slice(0, 20);
      saveJSON(KEYS.recentOrders, next);
      return next;
    });
  }, []);
  const forgetOrder = useCallback((orderNo: string) => {
    setRecent((list) => {
      const next = list.filter((x) => x.orderNo !== orderNo);
      saveJSON(KEYS.recentOrders, next);
      return next;
    });
  }, []);
  const phoneFor = useCallback(
    (orderNo: string) => recentOrders.find((o) => o.orderNo.toUpperCase() === orderNo.toUpperCase())?.phone ?? null,
    [recentOrders],
  );

  const addSearch = useCallback((q: string) => {
    const t = q.trim();
    if (t.length < 2) return;
    setSearches((list) => {
      const next = [t, ...list.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      saveJSON(KEYS.recentSearches, next);
      return next;
    });
  }, []);
  const clearSearches = useCallback(() => {
    setSearches([]);
    saveJSON(KEYS.recentSearches, null);
  }, []);

  const value = useMemo(
    () => ({ ready, session, signIn, signOut, recentOrders, rememberOrder, forgetOrder, phoneFor, recentSearches, addSearch, clearSearches }),
    [ready, session, signIn, signOut, recentOrders, rememberOrder, forgetOrder, phoneFor, recentSearches, addSearch, clearSearches],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
