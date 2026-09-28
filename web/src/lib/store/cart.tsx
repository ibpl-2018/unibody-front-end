'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EMPTY_CART, cartAdd, cartCount, cartItems, cartRemove, cartSetQty, cartSubtotal, type CartLine, type CartState, type ProductCardDTO } from '@unibody/shared';
import { KEYS, readJSON, writeJSON } from './storage';

interface CartCtx {
  cart: CartState;
  /** false until localStorage has been read (avoid flashing "empty bag") */
  ready: boolean;
  count: number;
  subtotal: number;
  items: { productId: string; qty: number }[];
  add: (line: Omit<CartLine, 'qty'>, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  /** Refresh cached fields (e.g. price from a server quote) without touching qty. */
  patchLine: (productId: string, patch: Partial<Omit<CartLine, 'productId' | 'qty'>>) => void;
  setCoupon: (code: string | null) => void;
  setPincode: (pin: string | null) => void;
  clear: () => void;
  /** Most recent add — drives the "Added to bag" popover. */
  lastAdded: { line: CartLine; at: number } | null;
  dismissAdded: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

function sanitize(raw: unknown): CartState {
  const s = (raw ?? {}) as Partial<CartState>;
  return {
    lines: Array.isArray(s.lines) ? s.lines.filter((l) => l && typeof l.productId === 'string' && l.qty > 0) : [],
    couponCode: typeof s.couponCode === 'string' ? s.couponCode : null,
    pincode: typeof s.pincode === 'string' ? s.pincode : null,
    myModelId: typeof s.myModelId === 'string' ? s.myModelId : null,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartCtx['lastAdded']>(null);

  useEffect(() => {
    setCart(sanitize(readJSON(KEYS.cart, EMPTY_CART)));
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.cart) setCart(sanitize(readJSON(KEYS.cart, EMPTY_CART)));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Persist only after the stored cart has been loaded (state-gated, so StrictMode re-mounts can't clobber it)
  useEffect(() => {
    if (ready) writeJSON(KEYS.cart, cart);
  }, [cart, ready]);

  const add = useCallback((line: Omit<CartLine, 'qty'>, qty = 1) => {
    setCart((s) => {
      const next = cartAdd(s, line, qty);
      const added = next.lines.find((l) => l.productId === line.productId);
      if (added) setLastAdded({ line: added, at: Date.now() });
      return next;
    });
  }, []);
  const setQty = useCallback((id: string, qty: number) => setCart((s) => cartSetQty(s, id, qty)), []);
  const remove = useCallback((id: string) => setCart((s) => cartRemove(s, id)), []);
  const patchLine = useCallback((id: string, patch: Partial<Omit<CartLine, 'productId' | 'qty'>>) => setCart((s) => ({ ...s, lines: s.lines.map((l) => (l.productId === id ? { ...l, ...patch } : l)) })), []);
  const setCoupon = useCallback((code: string | null) => setCart((s) => ({ ...s, couponCode: code ? code.trim().toUpperCase() : null })), []);
  const setPincode = useCallback((pin: string | null) => setCart((s) => ({ ...s, pincode: pin })), []);
  const clear = useCallback(() => setCart((s) => ({ ...EMPTY_CART, pincode: s.pincode, myModelId: s.myModelId })), []);
  const dismissAdded = useCallback(() => setLastAdded(null), []);

  const value = useMemo<CartCtx>(
    () => ({ cart, ready, count: cartCount(cart), subtotal: cartSubtotal(cart), items: cartItems(cart), add, setQty, remove, patchLine, setCoupon, setPincode, clear, lastAdded, dismissAdded }),
    [cart, ready, add, setQty, remove, patchLine, setCoupon, setPincode, clear, lastAdded, dismissAdded],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside <CartProvider>');
  return c;
}

/** Map an API product card to a cart line. */
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
