import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { BRAND, DEFAULT_PRICING, type StoreConfigDTO } from '@/shared';

/** Fallback so the app renders offline before /api/store/config arrives. */
export const FALLBACK_CONFIG: StoreConfigDTO = {
  storeName: BRAND.name,
  supportPhone: BRAND.supportPhone,
  whatsapp: BRAND.whatsapp,
  announcement: '',
  disclaimer: BRAND.disclaimer,
  codEnabled: true,
  codFee: DEFAULT_PRICING.codFee,
  codMaxOrder: DEFAULT_PRICING.codMaxOrder,
  prepaidDiscountPct: DEFAULT_PRICING.prepaidDiscountPct,
  freeShippingOver: DEFAULT_PRICING.freeShippingOver,
  onlinePaymentsEnabled: true,
  razorpayKeyId: null,
  cities: [],
  banner: null,
};

const Ctx = createContext<{ config: StoreConfigDTO; loaded: boolean; reload: () => void }>({ config: FALLBACK_CONFIG, loaded: false, reload: () => {} });

export function StoreConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoreConfigDTO>(FALLBACK_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    api.store
      .config()
      .then((c) => {
        if (alive) {
          setConfig(c);
          setLoaded(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [n]);
  return <Ctx.Provider value={{ config, loaded, reload: () => setN((x) => x + 1) }}>{children}</Ctx.Provider>;
}

export const useStoreConfig = () => useContext(Ctx);
