export const BRAND = {
  name: 'Unibody',
  tagline: 'Every part for every Mac.',
  supportPhone: '+91 80 4000 1234',
  whatsapp: '918040001234',
  disclaimer:
    'Unibody is an independent retailer of replacement parts and is not affiliated with, authorised by, or endorsed by Apple Inc. Apple, Mac, MacBook, MacBook Air, MacBook Pro, iMac, iPhone and iPad are trademarks of Apple Inc., used only to describe compatibility. Parts are sold as Genuine (pulled / refurbished) or Compatible, as labelled on each listing.',
} as const;

export const ORDER_STATUSES = [
  'NEW',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The happy path shown as a progress timeline to customers. */
export const ORDER_FLOW: OrderStatus[] = ['NEW', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'Placed',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

/** Admin-side label (the store calls a fresh order "New"). */
export const ADMIN_STATUS_LABEL: Record<OrderStatus, string> = { ...STATUS_LABEL, NEW: 'New' };

/** Allowed transitions. Anything not listed is rejected by the API. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

/** Customers may cancel themselves until the order is packed. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ['NEW', 'CONFIRMED'];

export const CONDITIONS = ['GENUINE_NEW_PULL', 'GENUINE_A', 'GENUINE_B', 'GENUINE_C', 'COMPATIBLE_NEW'] as const;
export type Condition = (typeof CONDITIONS)[number];
export const CONDITION_LABEL: Record<Condition, string> = {
  GENUINE_NEW_PULL: 'Genuine · New pull',
  GENUINE_A: 'Genuine · Grade A',
  GENUINE_B: 'Genuine · Grade B',
  GENUINE_C: 'Genuine · Grade C',
  COMPATIBLE_NEW: 'Compatible · New',
};
export const CONDITION_SHORT: Record<Condition, string> = {
  GENUINE_NEW_PULL: 'New pull',
  GENUINE_A: 'Grade A',
  GENUINE_B: 'Grade B',
  GENUINE_C: 'Grade C',
  COMPATIBLE_NEW: 'Compatible',
};
export type Tone = 'success' | 'info' | 'purple' | 'warning' | 'danger' | 'neutral';
export const CONDITION_TONE: Record<Condition, Tone> = {
  GENUINE_NEW_PULL: 'success',
  GENUINE_A: 'success',
  GENUINE_B: 'info',
  GENUINE_C: 'warning',
  COMPATIBLE_NEW: 'purple',
};
export const CONDITION_DESCRIPTION: Record<Condition, string> = {
  GENUINE_NEW_PULL: 'Original part removed from a new or unused device. Flawless.',
  GENUINE_A: 'Original part, fully working, minimal signs of use.',
  GENUINE_B: 'Original part, fully working, light visible wear.',
  GENUINE_C: 'Original part, fully working, noticeable wear. Best value.',
  COMPATIBLE_NEW: 'Brand-new, high-quality compatible part. Tested for fit.',
};

export const STATUS_TONE: Record<OrderStatus, Tone> = {
  NEW: 'warning',
  CONFIRMED: 'info',
  PACKED: 'purple',
  SHIPPED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'danger',
};

export const PAYMENT_METHODS = ['UPI', 'CARD', 'NETBANKING', 'COD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  UPI: 'UPI',
  CARD: 'Credit / Debit card',
  NETBANKING: 'Net banking',
  COD: 'Cash on Delivery',
};

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD_PENDING', 'COD_COLLECTED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ADMIN_ROLES = ['OWNER', 'MANAGER', 'PACKER'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
/** OWNER is the single Super Admin; MANAGER = Admin (e.g. partners); PACKER = Staff. */
export const ROLE_LABEL: Record<AdminRole, string> = { OWNER: 'Super admin', MANAGER: 'Admin', PACKER: 'Staff' };

export const LEAD_STAGES = ['ABANDONED', 'CONTACTED', 'CONVERTED', 'LOST'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const COUPON_TYPES = ['PERCENT', 'FLAT', 'FREE_COD'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'HIDDEN'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const UNIT_STATUSES = ['IN_STOCK', 'RESERVED', 'SOLD', 'RETURNED', 'SCRAPPED', 'MISSING'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const MOVEMENT_TYPES = ['PURCHASE', 'HARVEST', 'SALE', 'RETURN', 'ADJUSTMENT', 'CANCEL', 'LOSS'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const COLOURS = ['Space Grey', 'Silver', 'Gold', 'Midnight', 'Starlight', 'Space Black', 'Sky Blue', 'Black', 'White', 'Blue', 'Green', 'Pink', 'Purple', 'Yellow', 'Orange'] as const;
export const COLOUR_HEX: Record<string, string> = {
  'Space Grey': '#7D7E80',
  Silver: '#E3E4E5',
  Gold: '#E3CBB0',
  Midnight: '#2E3642',
  Starlight: '#F0E4D3',
  'Space Black': '#2E2C2E',
  'Sky Blue': '#BFD4E6',
  Black: '#1D1D1F',
  White: '#F5F5F7',
  Blue: '#3E5C7A',
  Green: '#4E6B5A',
  Pink: '#E8C4C4',
  Purple: '#B8A8C9',
  Yellow: '#EFD98A',
  Orange: '#E3A36C',
};

export const KEYBOARD_LAYOUTS = ['US', 'UK', 'IN'] as const;

// ---------------- Security ----------------
export const APPROVAL_KINDS = ['STOCK_ADJUST', 'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'ORDER_STATUS', 'INVOICE_GENERATE', 'UNIT_WRITE_OFF'] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];
export const APPROVAL_KIND_LABEL: Record<ApprovalKind, string> = {
  STOCK_ADJUST: 'Stock adjustment',
  PRODUCT_UPDATE: 'Price / cost change',
  PRODUCT_DELETE: 'Delete product',
  ORDER_STATUS: 'Order cancel / return',
  INVOICE_GENERATE: 'Manual invoice',
  UNIT_WRITE_OFF: 'Write off missing units',
};
export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'FAILED'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export const ALERT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
/** VISIBLE: requester is told it awaits approval. DISCREET: requester sees a normal success; the owner reviews quietly. */
export const APPROVAL_MODES = ['VISIBLE', 'DISCREET'] as const;
export type ApprovalMode = (typeof APPROVAL_MODES)[number];
