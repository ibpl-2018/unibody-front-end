import type { CouponType, PaymentMethod } from './constants';
import { formatINR } from './money';

/** Prices are GST-inclusive integer paise. */
export interface QuoteLineInput {
  productId: string;
  unitPrice: number;
  qty: number;
  gstRate: number;
  title?: string;
}

export interface CouponRule {
  code: string;
  type: CouponType;
  /** PERCENT: 0-100, FLAT: paise, FREE_COD: ignored */
  value: number;
  maxDiscount?: number | null;
  minOrder?: number | null;
  prepaidOnly?: boolean;
  allowCod?: boolean;
}

export interface PricingSettings {
  codFee: number;
  codMaxOrder: number;
  codMinOrder: number;
  prepaidDiscountPct: number;
  freeShippingOver: number;
  shippingFee: number;
}

export const DEFAULT_PRICING: PricingSettings = {
  codFee: 4900,
  codMaxOrder: 1500000,
  codMinOrder: 29900,
  prepaidDiscountPct: 5,
  freeShippingOver: 199900,
  shippingFee: 9900,
};

export interface ServiceAreaInfo {
  serviceable: boolean;
  cod: boolean;
  shippingFee?: number | null;
}

export interface Quote {
  lines: (QuoteLineInput & { lineTotal: number })[];
  itemCount: number;
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  couponError: string | null;
  prepaidDiscount: number;
  shipping: number;
  codFee: number;
  total: number;
  /** What the customer would pay if they chose prepaid instead (useful for nudges). */
  prepaidTotal: number;
  codAllowed: boolean;
  codBlockedReason: string | null;
  paymentMethod: PaymentMethod | null;
}

export function computeQuote(
  lines: QuoteLineInput[],
  opts: {
    coupon?: CouponRule | null;
    paymentMethod?: PaymentMethod | null;
    settings?: PricingSettings;
    area?: ServiceAreaInfo | null;
  } = {},
): Quote {
  const s = opts.settings ?? DEFAULT_PRICING;
  const method = opts.paymentMethod ?? null;
  const priced = lines.map((l) => ({ ...l, lineTotal: l.unitPrice * l.qty }));
  const subtotal = priced.reduce((a, l) => a + l.lineTotal, 0);
  const itemCount = priced.reduce((a, l) => a + l.qty, 0);

  let couponDiscount = 0;
  let couponError: string | null = null;
  let freeCod = false;
  const c = opts.coupon ?? null;
  if (c) {
    if (c.minOrder && subtotal < c.minOrder) {
      couponError = `Add items worth ${formatINR(c.minOrder - subtotal)} more to use ${c.code}`;
    } else if (c.prepaidOnly && method === 'COD') {
      couponError = `${c.code} is valid on prepaid orders only`;
    } else if (c.allowCod === false && method === 'COD') {
      couponError = `${c.code} is not valid with Cash on Delivery`;
    } else if (c.type === 'PERCENT') {
      couponDiscount = Math.floor((subtotal * c.value) / 100);
      if (c.maxDiscount) couponDiscount = Math.min(couponDiscount, c.maxDiscount);
    } else if (c.type === 'FLAT') {
      couponDiscount = Math.min(c.value, subtotal);
    } else if (c.type === 'FREE_COD') {
      freeCod = true;
    }
  }
  // Round coupon discount to whole rupees so displayed totals stay clean.
  couponDiscount = Math.floor(couponDiscount / 100) * 100;
  const afterCoupon = subtotal - couponDiscount;

  const prepaidDiscountFor = (m: PaymentMethod | null) =>
    m && m !== 'COD' && s.prepaidDiscountPct > 0 ? Math.floor((afterCoupon * s.prepaidDiscountPct) / 100 / 100) * 100 : 0;
  const prepaidDiscount = prepaidDiscountFor(method);

  const baseShipping = opts.area?.shippingFee ?? s.shippingFee;
  const shipping = subtotal === 0 || afterCoupon >= s.freeShippingOver ? 0 : baseShipping;

  let codAllowed = true;
  let codBlockedReason: string | null = null;
  if (opts.area && !opts.area.cod) {
    codAllowed = false;
    codBlockedReason = 'Cash on Delivery is not available for this pincode';
  } else if (afterCoupon > s.codMaxOrder) {
    codAllowed = false;
    codBlockedReason = `Cash on Delivery is available up to ${formatINR(s.codMaxOrder)}`;
  } else if (afterCoupon < s.codMinOrder) {
    codAllowed = false;
    codBlockedReason = `Cash on Delivery needs a minimum order of ${formatINR(s.codMinOrder)}`;
  }

  const codFee = method === 'COD' && !freeCod ? s.codFee : 0;
  const total = afterCoupon - prepaidDiscount + shipping + codFee;
  const prepaidTotal = afterCoupon - prepaidDiscountFor('UPI') + shipping;

  return {
    lines: priced,
    itemCount,
    subtotal,
    couponCode: c && !couponError ? c.code : null,
    couponDiscount,
    couponError,
    prepaidDiscount,
    shipping,
    codFee,
    total,
    prepaidTotal,
    codAllowed,
    codBlockedReason,
    paymentMethod: method,
  };
}
