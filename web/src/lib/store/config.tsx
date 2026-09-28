'use client';
import { createContext, useContext } from 'react';
import { BRAND, DEFAULT_PRICING, type StoreConfigDTO } from '@unibody/shared';

/** Used when the API is unreachable so the shell still renders. */
export const FALLBACK_CONFIG: StoreConfigDTO = {
  storeName: BRAND.name,
  supportPhone: BRAND.supportPhone,
  whatsapp: BRAND.whatsapp,
  announcement: 'Cash on Delivery in 6 cities · Free delivery over ₹1,999',
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

const Ctx = createContext<StoreConfigDTO>(FALLBACK_CONFIG);

export function StoreConfigProvider({ config, children }: { config: StoreConfigDTO; children: React.ReactNode }) {
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}

export const useStoreConfig = () => useContext(Ctx);
