import { z } from 'zod';
import { ADMIN_ROLES, CONDITIONS, COUPON_TYPES, LEAD_STAGES, ORDER_STATUSES, PAYMENT_METHODS, PRODUCT_STATUSES } from './constants';

/** "+91 98765-43210" / "098765 43210" / "919876543210" -> "9876543210" */
export function normalizePhone(input: string): string {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}
export const isValidPhone = (p: string) => /^[6-9]\d{9}$/.test(normalizePhone(p));
export const maskPhone = (p: string) => {
  const d = normalizePhone(p);
  return d.length === 10 ? `+91 ${d.slice(0, 2)}•••••${d.slice(7)}` : p;
};
export const formatPhone = (p: string) => {
  const d = normalizePhone(p);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p;
};

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');
export const pincodeSchema = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode');
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN');

export const otpSendSchema = z.object({ phone: phoneSchema });
export const otpVerifySchema = z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });

export const addressSchema = z.object({
  line1: z.string().trim().min(3, 'Flat / house / building is required').max(160),
  line2: z.string().trim().min(3, 'Area / street is required').max(160),
  landmark: z.string().trim().max(120).optional().or(z.literal('')),
  pincode: pincodeSchema,
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  label: z.enum(['HOME', 'WORK', 'SHOP']).default('HOME'),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartItemSchema = z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(10) });
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const quoteSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(30),
  couponCode: z.string().trim().toUpperCase().max(32).optional().or(z.literal('')),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  pincode: pincodeSchema.optional().or(z.literal('')),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export const placeOrderSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: addressSchema,
  items: z.array(cartItemSchema).min(1).max(30),
  couponCode: z.string().trim().toUpperCase().max(32).optional().or(z.literal('')),
  paymentMethod: z.enum(PAYMENT_METHODS),
  whatsappOptIn: z.boolean().default(true),
  gstin: gstinSchema.optional().or(z.literal('')),
  source: z.enum(['WEB', 'IOS', 'ANDROID', 'ADMIN']).default('WEB'),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

/** Staff-created order (phone / WhatsApp / walk-in). No OTP — the staff member vouches for the number. */
export const adminPlaceOrderSchema = placeOrderSchema.omit({ source: true }).extend({
  phone: phoneSchema,
  /** Online method only: payment already received outside the site (UPI to shop, cash, card machine). */
  paidOffline: z.boolean().default(false),
  paymentRef: z.string().trim().max(60).optional().or(z.literal('')),
});
export type AdminPlaceOrderInput = z.input<typeof adminPlaceOrderSchema>;

export const leadSchema = z.object({
  name: z.string().trim().max(80).optional(),
  items: z.array(cartItemSchema).min(1).max(30),
  pincode: z.string().optional(),
});

export const trackSchema = z.object({ orderNo: z.string().trim().toUpperCase().min(6).max(24), phone: phoneSchema });

// ---------- Admin ----------
export const adminLoginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(6) });
const otpCodeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');
/** Staff sign-in with a code sent to the phone on their account. */
export const adminOtpVerifySchema = z.object({ phone: phoneSchema, code: otpCodeSchema });
/** Second step for the Super Admin: the ticket from the password step + the code sent to their phone. */
export const adminTwoStepSchema = z.object({ ticket: z.string().min(10), code: otpCodeSchema });
export const adminForgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const adminResetSchema = z.object({ email: z.string().trim().toLowerCase().email(), code: otpCodeSchema, password: z.string().min(8, 'Use at least 8 characters') });

export const staffSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).optional(),
  /** Phone for OTP sign-in, password reset and (Super Admin) 2-step verification. */
  phone: z.union([phoneSchema, z.literal('').transform(() => null), z.null()]).optional(),
  role: z.enum(ADMIN_ROLES),
  active: z.boolean().default(true),
});

export const familySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  icon: z.enum(['laptop', 'imac', 'phone', 'ipad', 'mini', 'accessory']).default('laptop'),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const modelSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().trim().min(1),
  yearFrom: z.number().int().min(2006).max(2100),
  yearTo: z.number().int().min(2006).max(2100).nullable().optional(),
  aNumbers: z.array(z.string().trim().toUpperCase().regex(/^A\d{4}$/)).min(1),
  emc: z.string().trim().optional().nullable(),
  chip: z.string().trim().optional().nullable(),
  sizeInch: z.number().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().default('box'),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const productInputSchema = z.object({
  title: z.string().trim().min(4).max(160),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().trim().max(4000).default(''),
  familyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  modelIds: z.array(z.string().uuid()).min(1, 'Pick at least one compatible model'),
  condition: z.enum(CONDITIONS),
  colour: z.string().trim().max(40).optional().nullable(),
  keyboardLayout: z.string().trim().max(8).optional().nullable(),
  partNumber: z.string().trim().max(40).optional().nullable(),
  warrantyDays: z.number().int().min(0).max(730).default(90),
  mrp: z.number().int().min(0).nullable().optional(),
  price: z.number().int().min(100),
  cost: z.number().int().min(0).default(0),
  gstRate: z.number().int().refine((v) => [0, 5, 12, 18, 28].includes(v), 'Invalid GST rate').default(18),
  hsn: z.string().trim().max(10).default('84733099'),
  codAllowed: z.boolean().default(true),
  status: z.enum(PRODUCT_STATUSES).default('ACTIVE'),
  featured: z.boolean().default(false),
  lowStockAlert: z.number().int().min(0).default(2),
  bin: z.string().trim().max(40).optional().nullable(),
  weightGrams: z.number().int().min(0).optional().nullable(),
  images: z.array(z.string().url()).max(12).default([]),
  initialStock: z.number().int().min(0).max(10000).optional(),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const statusUpdateSchema = z.object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(500).optional() });
export const noteSchema = z.object({ note: z.string().trim().min(1).max(1000) });
export const shipmentSchema = z.object({ courier: z.string().trim().min(2), awb: z.string().trim().min(4), trackingUrl: z.string().url().optional().or(z.literal('')) });
export const assignUnitSchema = z.object({ itemId: z.string().uuid(), unitId: z.string().uuid() });

export const stockAdjustSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.string().trim().min(3).max(200),
  unitCost: z.number().int().min(0).optional(),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(2),
  city: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  gstin: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const purchaseSchema = z.object({
  supplierId: z.string().uuid(),
  reference: z.string().trim().max(60).optional().nullable(),
  date: z.string().optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  amountPaid: z.number().int().min(0).default(0),
  lines: z
    .array(
      z.object({
        kind: z.enum(['PART', 'DONOR']).default('PART'),
        productId: z.string().uuid().optional().nullable(),
        description: z.string().trim().min(2).max(200),
        qty: z.number().int().min(1).max(10000),
        unitCost: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const harvestSchema = z.object({
  lineId: z.string().uuid(),
  label: z.string().trim().max(80).optional(),
  parts: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(50).default(1),
        cost: z.number().int().min(0),
        serial: z.string().trim().max(60).optional().nullable(),
      }),
    )
    .min(1),
});

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,24}$/),
  description: z.string().trim().max(200).default(''),
  type: z.enum(COUPON_TYPES),
  value: z.number().int().min(0),
  maxDiscount: z.number().int().min(0).nullable().optional(),
  minOrder: z.number().int().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perPhoneLimit: z.number().int().min(1).nullable().optional(),
  prepaidOnly: z.boolean().default(false),
  allowCod: z.boolean().default(true),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  active: z.boolean().default(true),
  showBanner: z.boolean().default(false),
  bannerTitle: z.string().trim().max(120).nullable().optional(),
  bannerSubtitle: z.string().trim().max(200).nullable().optional(),
});
export type CouponInput = z.infer<typeof couponSchema>;

export const leadStageSchema = z.object({ stage: z.enum(LEAD_STAGES), note: z.string().optional() });

export const serviceAreaSchema = z.object({
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincodePrefixes: z.array(z.string().regex(/^\d{2,6}$/)).min(1),
  etaDays: z.number().int().min(1).max(15),
  cod: z.boolean().default(true),
  shippingFee: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
});

export const settingsSchema = z.object({
  storeName: z.string().optional(),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  storeState: z.string().optional(),
  storeAddress: z.string().optional(),
  supportPhone: z.string().optional(),
  supportEmail: z.string().optional(),
  codEnabled: z.boolean().optional(),
  codFee: z.number().int().min(0).optional(),
  codMaxOrder: z.number().int().min(0).optional(),
  codMinOrder: z.number().int().min(0).optional(),
  prepaidDiscountPct: z.number().min(0).max(50).optional(),
  freeShippingOver: z.number().int().min(0).optional(),
  shippingFee: z.number().int().min(0).optional(),
  onlinePaymentsEnabled: z.boolean().optional(),
  announcement: z.string().max(200).optional(),
  disclaimer: z.string().max(2000).optional(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
