/**
 * Platform-agnostic cart model. Web persists it in localStorage, mobile in AsyncStorage.
 * Only productId + qty are authoritative; price/title are cached for instant rendering
 * and always re-validated by POST /api/cart/quote.
 */
export interface CartLine {
  productId: string;
  slug: string;
  title: string;
  price: number;
  mrp: number | null;
  qty: number;
  condition: string;
  icon: string;
  image: string | null;
  fitsLabel: string;
  maxQty: number;
}

export interface CartState {
  lines: CartLine[];
  couponCode: string | null;
  pincode: string | null;
  /** The device the shopper told us they own — drives "Fits your device". */
  myModelId: string | null;
}

export const EMPTY_CART: CartState = { lines: [], couponCode: null, pincode: null, myModelId: null };

export function cartAdd(state: CartState, line: Omit<CartLine, 'qty'>, qty = 1): CartState {
  const existing = state.lines.find((l) => l.productId === line.productId);
  const max = Math.max(1, Math.min(line.maxQty || 10, 10));
  if (existing) {
    return { ...state, lines: state.lines.map((l) => (l.productId === line.productId ? { ...l, ...line, qty: Math.min(max, l.qty + qty) } : l)) };
  }
  return { ...state, lines: [...state.lines, { ...line, qty: Math.min(max, qty) }] };
}

export function cartSetQty(state: CartState, productId: string, qty: number): CartState {
  if (qty <= 0) return cartRemove(state, productId);
  return { ...state, lines: state.lines.map((l) => (l.productId === productId ? { ...l, qty: Math.min(Math.max(1, l.maxQty || 10), qty) } : l)) };
}

export function cartRemove(state: CartState, productId: string): CartState {
  return { ...state, lines: state.lines.filter((l) => l.productId !== productId) };
}

export const cartCount = (s: CartState) => s.lines.reduce((a, l) => a + l.qty, 0);
export const cartSubtotal = (s: CartState) => s.lines.reduce((a, l) => a + l.qty * l.price, 0);
export const cartItems = (s: CartState) => s.lines.map((l) => ({ productId: l.productId, qty: l.qty }));
