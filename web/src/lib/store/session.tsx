'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { OtpVerifyResponse } from '@unibody/shared';
import { customerToken } from '@/lib/api';
import { KEYS, readJSON, writeJSON } from './storage';

/** OTP-verified shopper. The bearer token itself lives in `customerToken` (lib/api). */
export interface CustomerSession {
  phone: string;
  name: string | null;
  registered: boolean;
  addresses: NonNullable<OtpVerifyResponse['customer']>['addresses'];
}

interface SessionCtx {
  session: CustomerSession | null;
  ready: boolean;
  signIn: (r: OtpVerifyResponse) => CustomerSession;
  update: (patch: Partial<CustomerSession>) => void;
  signOut: () => void;
}
const Ctx = createContext<SessionCtx>({ session: null, ready: false, signIn: () => ({ phone: '', name: null, registered: false, addresses: [] }), update: () => {}, signOut: () => {} });

/** Decode the JWT expiry without verifying (display-only). */
function tokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return !!payload.exp && payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return false;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = readJSON<CustomerSession | null>(KEYS.customer, null);
    if (s && !tokenExpired(customerToken.get())) setSession(s);
    else if (s) {
      writeJSON(KEYS.customer, null);
      customerToken.set(null);
    }
    setReady(true);
  }, []);

  const signIn = useCallback((r: OtpVerifyResponse) => {
    customerToken.set(r.token);
    const s: CustomerSession = { phone: r.phone, name: r.customer?.name ?? null, registered: r.customer?.registered ?? false, addresses: r.customer?.addresses ?? [] };
    writeJSON(KEYS.customer, s);
    setSession(s);
    return s;
  }, []);
  const update = useCallback((patch: Partial<CustomerSession>) => {
    setSession((s) => {
      if (!s) return s;
      const n = { ...s, ...patch };
      writeJSON(KEYS.customer, n);
      return n;
    });
  }, []);
  const signOut = useCallback(() => {
    customerToken.set(null);
    writeJSON(KEYS.customer, null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, ready, signIn, update, signOut }), [session, ready, signIn, update, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
