import { describe, expect, it } from 'vitest';
import { amountInWords, formatINR, percentOff } from './money';
import { computeQuote, DEFAULT_PRICING } from './pricing';
import { buildTaxLines, distributeDiscount, fyLabel, splitTax } from './gst';
import { normalizePhone, placeOrderSchema } from './schemas';
import { cartAdd, cartCount, cartSetQty, EMPTY_CART } from './cart';

describe('money', () => {
  it('formats INR with Indian grouping', () => {
    expect(formatINR(1499900)).toBe('₹14,999');
    expect(formatINR(84231000)).toBe('₹8,42,310');
    expect(formatINR(4900)).toBe('₹49');
    expect(formatINR(-193000)).toBe('−₹1,930');
    expect(formatINR(1499950, { decimals: true })).toBe('₹14,999.50');
  });
  it('percent off', () => {
    expect(percentOff(1499900, 2199900)).toBe(31);
    expect(percentOff(100, null)).toBe(0);
  });
  it('amount in words', () => {
    expect(amountInWords(1741700)).toBe('Rupees Seventeen Thousand Four Hundred Seventeen Only');
    expect(amountInWords(12345600)).toBe('Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only');
  });
});

describe('pricing', () => {
  const lines = [
    { productId: 'a', unitPrice: 1499900, qty: 1, gstRate: 18 },
    { productId: 'b', unitPrice: 429900, qty: 1, gstRate: 18 },
  ];
  it('applies percent coupon with cap and COD fee', () => {
    const q = computeQuote(lines, { coupon: { code: 'FESTIVE20', type: 'PERCENT', value: 10, maxDiscount: 500000 }, paymentMethod: 'COD', settings: { ...DEFAULT_PRICING, prepaidDiscountPct: 0 } });
    expect(q.subtotal).toBe(1929800);
    expect(q.couponDiscount).toBe(192900);
    expect(q.codFee).toBe(4900);
    expect(q.shipping).toBe(0);
    expect(q.total).toBe(1929800 - 192900 + 4900);
    expect(q.prepaidDiscount).toBe(0);
  });
  it('gives prepaid discount only for online methods', () => {
    const q = computeQuote(lines, { paymentMethod: 'UPI', settings: { ...DEFAULT_PRICING, prepaidDiscountPct: 5 } });
    expect(q.prepaidDiscount).toBe(96400);
    expect(q.codFee).toBe(0);
  });
  it('blocks COD above limit and for non-COD areas', () => {
    expect(computeQuote([{ productId: 'x', unitPrice: 2000000, qty: 1, gstRate: 18 }]).codAllowed).toBe(false);
    expect(computeQuote(lines, { area: { serviceable: true, cod: false } }).codAllowed).toBe(false);
  });
  it('rejects coupon below minimum', () => {
    const q = computeQuote([{ productId: 'x', unitPrice: 50000, qty: 1, gstRate: 18 }], { coupon: { code: 'BIG', type: 'FLAT', value: 20000, minOrder: 99900 } });
    expect(q.couponDiscount).toBe(0);
    expect(q.couponError).toContain('BIG');
    expect(q.shipping).toBe(DEFAULT_PRICING.shippingFee);
  });
});

describe('gst', () => {
  it('splits inclusive tax', () => {
    const t = splitTax(1180000, 18, true);
    expect(t.taxable).toBe(1000000);
    expect(t.cgst + t.sgst).toBe(180000);
    expect(splitTax(1180000, 18, false).igst).toBe(180000);
  });
  it('distributes discount exactly', () => {
    const d = distributeDiscount([1000, 2000, 3001], 1000);
    expect(d.reduce((a, b) => a + b, 0)).toBe(6001 - 1000);
  });
  it('builds reconciling invoice lines', () => {
    const r = buildTaxLines(
      [
        { description: 'Display', hsn: '84733099', qty: 1, amount: 1499900, gstRate: 18 },
        { description: 'Battery', hsn: '85076000', qty: 1, amount: 429900, gstRate: 18 },
      ],
      192900,
      true,
    );
    expect(r.totals.total).toBe(1929800 - 192900);
    expect(r.totals.taxable + r.totals.cgst + r.totals.sgst).toBe(r.totals.total);
  });
  it('financial year label', () => {
    expect(fyLabel(new Date('2026-09-27'))).toBe('26-27');
    expect(fyLabel(new Date('2027-02-01'))).toBe('26-27');
  });
});

describe('schemas & cart', () => {
  it('normalizes phones', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('9876543210');
    expect(normalizePhone('098765 43210')).toBe('9876543210');
  });
  it('validates checkout', () => {
    const r = placeOrderSchema.safeParse({
      name: 'Rahul',
      address: { line1: 'Flat 402', line2: 'Whitefield', pincode: '560034', city: 'Bengaluru', state: 'Karnataka' },
      items: [{ productId: '1b4e28ba-2fa1-11d2-883f-0016d3cca427', qty: 1 }],
      paymentMethod: 'COD',
    });
    expect(r.success).toBe(true);
  });
  it('cart add/qty', () => {
    let c = cartAdd(EMPTY_CART, { productId: 'p', slug: 's', title: 't', price: 100, mrp: null, condition: 'GENUINE_A', icon: 'display', image: null, fitsLabel: '', maxQty: 3 });
    c = cartAdd(c, { productId: 'p', slug: 's', title: 't', price: 100, mrp: null, condition: 'GENUINE_A', icon: 'display', image: null, fitsLabel: '', maxQty: 3 }, 5);
    expect(cartCount(c)).toBe(3);
    c = cartSetQty(c, 'p', 0);
    expect(cartCount(c)).toBe(0);
  });
});
