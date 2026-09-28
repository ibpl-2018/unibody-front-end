import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { KEYS, loadJSON, loadRaw, saveJSON } from '@/lib/storage';
import {
  cartAdd,
  cartCount,
  cartItems,
  cartRemove,
  cartSetQty,
  cartSubtotal,
  EMPTY_CART,
  type CartLine,
  type CartState,
  type DeviceModelDTO,
  type ProductCardDTO,
} from '@/shared';

interface CartCtx {
  cart: CartState;
  ready: boolean;
  count: number;
  subtotal: number;
  items: { productId: string; qty: number }[];
  add: (p: ProductCardDTO, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
  setPincode: (pin: string | null) => void;
  /** The shopper's own device ("Fits your …"). */
  myDevice: DeviceModelDTO | null;
  setMyDevice: (m: DeviceModelDTO | null) => void;
}

const Ctx = createContext<CartCtx | null>(null);

export const lineFromProduct = (p: ProductCardDTO): Omit<CartLine, 'qty'> => ({
  productId: p.id,
  slug: p.slug,
  title: p.title,
  price: p.price,
  mrp: p.mrp,
  condition: p.condition,
  icon: p.icon,
  image: p.image,
  fitsLabel: p.fitsLabel,
  maxQty: Math.max(1, Math.min(p.stock, 10)),
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [myDevice, setMyDeviceState] = useState<DeviceModelDTO | null>(null);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    Promise.all([loadJSON<CartState>(KEYS.cart, EMPTY_CART), loadRaw<DeviceModelDTO>(KEYS.myDevice)]).then(([c, d]) => {
      setCart({ ...EMPTY_CART, ...c, lines: Array.isArray(c.lines) ? c.lines : [] });
      setMyDeviceState(d);
      loaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded.current) saveJSON(KEYS.cart, cart);
  }, [cart]);

  const add = useCallback((p: ProductCardDTO, qty = 1) => setCart((s) => cartAdd(s, lineFromProduct(p), qty)), []);
  const setQty = useCallback((id: string, qty: number) => setCart((s) => cartSetQty(s, id, qty)), []);
  const remove = useCallback((id: string) => setCart((s) => cartRemove(s, id)), []);
  const clear = useCallback(() => setCart((s) => ({ ...s, lines: [], couponCode: null })), []);
  const setCoupon = useCallback((code: string | null) => setCart((s) => ({ ...s, couponCode: code ? code.trim().toUpperCase() : null })), []);
  const setPincode = useCallback((pin: string | null) => setCart((s) => ({ ...s, pincode: pin })), []);
  const setMyDevice = useCallback((m: DeviceModelDTO | null) => {
    setMyDeviceState(m);
    saveJSON(KEYS.myDevice, m);
    setCart((s) => ({ ...s, myModelId: m?.id ?? null }));
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      cart,
      ready,
      count: cartCount(cart),
      subtotal: cartSubtotal(cart),
      items: cartItems(cart),
      add,
      setQty,
      remove,
      clear,
      setCoupon,
      setPincode,
      myDevice,
      setMyDevice,
    }),
    [cart, ready, add, setQty, remove, clear, setCoupon, setPincode, myDevice, setMyDevice],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCart must be used inside CartProvider');
  return v;
}
