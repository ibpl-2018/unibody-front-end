'use client';
import { useEffect, useRef, useState } from 'react';
import { ApiError, type PaymentMethod, type QuoteDTO } from '@unibody/shared';
import { api } from '@/lib/api';

/** Live server quote (debounced). The server is the source of truth for totals, coupon and COD rules. */
export function useQuote(input: { items: { productId: string; qty: number }[]; couponCode?: string | null; paymentMethod?: PaymentMethod | null; pincode?: string | null }, enabled = true) {
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const key = JSON.stringify([input.items, input.couponCode ?? '', input.paymentMethod ?? '', /^[1-9]\d{5}$/.test(input.pincode ?? '') ? input.pincode : '']);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled || input.items.length === 0) {
      setQuote(null);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      api.store
        .quote({
          items: input.items,
          couponCode: input.couponCode || undefined,
          paymentMethod: input.paymentMethod ?? undefined,
          pincode: /^[1-9]\d{5}$/.test(input.pincode ?? '') ? input.pincode! : undefined,
        })
        .then((q) => {
          if (id !== seq.current) return;
          setQuote(q);
          setError(null);
        })
        .catch((e) => {
          if (id !== seq.current) return;
          setError(e instanceof ApiError ? e.message : 'Couldn’t update prices. Check your connection.');
        })
        .finally(() => id === seq.current && setLoading(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, nonce]);

  return { quote, loading, error, refresh: () => setNonce((n) => n + 1) };
}

/** Approximate GST contained in a GST-inclusive amount (all parts are 18%). */
export const gstIncluded = (amount: number, rate = 18) => Math.round((amount * rate) / (100 + rate));
