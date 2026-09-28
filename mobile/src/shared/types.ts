import type {
  AdminRole,
  Condition,
  CouponType,
  LeadStage,
  MovementType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  UnitStatus,
} from './constants';
import type { Quote } from './pricing';

/** Money fields are integer paise everywhere. Dates are ISO strings. */

export type FamilyIcon = 'laptop' | 'imac' | 'phone' | 'ipad' | 'mini' | 'accessory';

export interface DeviceModelDTO {
  id: string;
  familyId: string;
  familySlug: string;
  familyName: string;
  name: string; // '13" M1'
  fullName: string; // 'MacBook Air 13" M1 (2020)'
  yearFrom: number;
  yearTo: number | null;
  yearLabel: string; // '2020' | '2012–2017'
  aNumbers: string[];
  emc: string | null;
  chip: string | null;
  sizeInch: number | null;
  productCount?: number;
}

export interface DeviceFamilyDTO {
  id: string;
  slug: string;
  name: string;
  icon: FamilyIcon;
  sortOrder: number;
  active: boolean;
  modelCount: number;
  productCount: number;
  fromPrice: number | null;
  models?: DeviceModelDTO[];
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  icon: string;
  sortOrder: number;
  active: boolean;
  productCount?: number;
}

export interface ProductCardDTO {
  id: string;
  slug: string;
  title: string;
  condition: Condition;
  colour: string | null;
  price: number;
  mrp: number | null;
  stock: number;
  familyId: string;
  familyName: string;
  categoryId: string;
  categoryName: string;
  /** Category icon key, used as illustration placeholder when no photo */
  icon: string;
  image: string | null;
  fitsLabel: string; // 'MacBook Air 13" M1 2020 · A2337'
  modelIds: string[];
  featured: boolean;
  codAllowed: boolean;
}

export interface ProductDetailDTO extends ProductCardDTO {
  description: string;
  partNumber: string | null;
  sku: string;
  keyboardLayout: string | null;
  warrantyDays: number;
  gstRate: number;
  images: string[];
  compatible: DeviceModelDTO[];
  /** Same part/model group in other conditions or colours */
  variants: ProductCardDTO[];
  related: ProductCardDTO[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductFacetsDTO {
  categories: { id: string; name: string; count: number }[];
  conditions: { value: Condition; count: number }[];
  colours: { value: string; count: number }[];
  /** Keyboard layouts present in the current scope (only products that have one). */
  layouts: { value: string; count: number }[];
  priceMin: number;
  priceMax: number;
}

export interface ProductListDTO extends Paged<ProductCardDTO> {
  facets: ProductFacetsDTO;
  model: DeviceModelDTO | null;
  family: DeviceFamilyDTO | null;
}

export interface ServiceabilityDTO {
  pincode: string;
  serviceable: boolean;
  city: string | null;
  state: string | null;
  cod: boolean;
  etaDays: number | null;
  etaDate: string | null;
  shippingFee: number | null;
}

export interface QuoteDTO extends Quote {
  unavailable: { productId: string; reason: string }[];
  area: ServiceabilityDTO | null;
}

export interface BannerDTO {
  code: string;
  title: string;
  subtitle: string;
  endsAt: string | null;
}

export interface StoreConfigDTO {
  storeName: string;
  supportPhone: string;
  whatsapp: string;
  announcement: string;
  disclaimer: string;
  codEnabled: boolean;
  codFee: number;
  codMaxOrder: number;
  prepaidDiscountPct: number;
  freeShippingOver: number;
  onlinePaymentsEnabled: boolean;
  razorpayKeyId: string | null;
  cities: { city: string; etaDays: number; cod: boolean }[];
  banner: BannerDTO | null;
}

export interface OtpSendResponse {
  sent: boolean;
  expiresInSec: number;
  /** Only present when the API runs with OTP_DEV_MODE=true */
  devCode?: string;
}
export interface OtpVerifyResponse {
  token: string;
  phone: string;
  customer: { name: string | null; registered: boolean; addresses: (AddressDTO & { id: string })[] } | null;
}

export interface AddressDTO {
  line1: string;
  line2: string;
  landmark?: string | null;
  pincode: string;
  city: string;
  state: string;
  label: 'HOME' | 'WORK' | 'SHOP';
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  title: string;
  sku: string;
  condition: Condition;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  icon: string;
  image: string | null;
  unitSerials: string[];
}

export interface OrderEventDTO {
  id: string;
  status: OrderStatus | null;
  label: string;
  note: string | null;
  at: string;
  internal: boolean;
  by: string | null;
}

export interface OrderTotalsDTO {
  subtotal: number;
  couponDiscount: number;
  prepaidDiscount: number;
  shipping: number;
  codFee: number;
  total: number;
}

export interface ShipmentDTO {
  courier: string;
  awb: string;
  trackingUrl: string | null;
  shippedAt: string | null;
}

export interface OrderPublicDTO {
  orderNo: string;
  status: OrderStatus;
  createdAt: string;
  etaDate: string | null;
  customerName: string;
  phoneMasked: string;
  address: AddressDTO;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItemDTO[];
  totals: OrderTotalsDTO;
  couponCode: string | null;
  events: OrderEventDTO[];
  shipment: ShipmentDTO | null;
  canCancel: boolean;
  invoiceNo: string | null;
}

export interface PlaceOrderResponse {
  orderNo: string;
  status: OrderStatus;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpay: { keyId: string; orderId: string; amount: number; currency: 'INR'; name: string; prefill: { name: string; contact: string; email?: string } } | null;
}

// ---------------- Admin ----------------
export interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt: string | null;
}
export interface AdminLoginResponse {
  token: string;
  user: AdminUserDTO;
}

export interface AdminOrderListItem {
  id: string;
  orderNo: string;
  createdAt: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  city: string;
  itemCount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  source: string;
}

export interface AdminOrderDetail extends Omit<OrderPublicDTO, 'phoneMasked'> {
  id: string;
  phone: string;
  email: string | null;
  gstin: string | null;
  whatsappOptIn: boolean;
  source: string;
  customerId: string;
  customerOrderCount: number;
  customerRegistered: boolean;
  nextStatuses: OrderStatus[];
  availableUnits: Record<string, { id: string; serial: string; grade: Condition | null; bin: string | null }[]>;
  invoiceId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
}

export interface AdminProductDTO extends ProductDetailDTO {
  cost: number;
  hsn: string;
  status: ProductStatus;
  lowStockAlert: number;
  bin: string | null;
  weightGrams: number | null;
  reserved: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductListItem extends ProductCardDTO {
  sku: string;
  cost: number;
  status: ProductStatus;
  reserved: number;
  onHand: number;
  lowStockAlert: number;
  bin: string | null;
  updatedAt: string;
}

export interface PaymentInfoDTO {
  orderNo: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  mock: boolean;
  razorpay: PlaceOrderResponse['razorpay'];
}

export interface DashboardDTO {
  range: { from: string; to: string; days: number };
  revenue: number;
  revenuePrev: number;
  orders: number;
  ordersPrev: number;
  aov: number;
  aovPrev: number;
  grossMargin: number; // 0..1
  grossMarginPrev: number;
  daily: { date: string; revenue: number; orders: number; /** units sold that day (optional for older API builds) */ units?: number }[];
  attention: { codToConfirm: number; toPack: number; toShip: number; lowStock: number; abandoned: number };
  paymentSplit: { cod: number; codCount: number; prepaid: number; prepaidCount: number; rtoRate: number };
  byCity: { city: string; orders: number; revenue: number }[];
  topProducts: { productId: string; title: string; sku: string; icon: string; image?: string | null; units: number; revenue: number }[];
  recentOrders: AdminOrderListItem[];
}

export interface InventoryRowDTO {
  productId: string;
  title: string;
  sku: string;
  icon: string;
  condition: Condition;
  onHand: number;
  reserved: number;
  available: number;
  bin: string | null;
  unitCost: number;
  value: number;
  lowStockAlert: number;
  state: 'OK' | 'LOW' | 'OUT';
  velocity30d: number;
  daysLeft: number | null;
}

export interface InventorySummaryDTO {
  stockValue: number;
  units: number;
  skus: number;
  reserved: number;
  lowStock: number;
  outOfStock: number;
}

export interface StockUnitDTO {
  id: string;
  productId: string;
  productTitle: string;
  serial: string;
  grade: Condition | null;
  bin: string | null;
  cost: number;
  status: UnitStatus;
  purchaseRef: string | null;
  createdAt: string;
}

export interface StockMovementDTO {
  id: string;
  productId: string;
  productTitle: string;
  sku: string;
  type: MovementType;
  qty: number;
  unitCost: number;
  reason: string | null;
  ref: string | null;
  by: string | null;
  at: string;
}

export interface SupplierDTO {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  gstin: string | null;
  notes: string | null;
  purchaseCount: number;
  totalPurchased: number;
  payable: number;
}

export interface PurchaseLineDTO {
  id: string;
  kind: 'PART' | 'DONOR';
  productId: string | null;
  productTitle: string | null;
  description: string;
  qty: number;
  unitCost: number;
  received: number;
  harvested: number;
  harvestedValue: number;
}

export interface PurchaseDTO {
  id: string;
  poNo: string;
  supplierId: string;
  supplierName: string;
  supplierCity: string | null;
  reference: string | null;
  date: string;
  notes: string | null;
  amount: number;
  amountPaid: number;
  paymentState: 'PAID' | 'PARTLY_PAID' | 'UNPAID';
  stockState: 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'HARVESTING';
  lines: PurchaseLineDTO[];
}

export interface AdminPlaceOrderResponse extends PlaceOrderResponse {
  id: string;
  /** Web /pay link to send the customer when the order awaits online payment. */
  payUrl: string | null;
}

export interface InvoiceDTO {
  id: string;
  invoiceNo: string;
  orderNo: string;
  date: string;
  seller: { legalName: string; address: string; gstin: string; state: string; stateCode: string };
  buyer: { name: string; phone: string; gstin: string | null; address: string; state: string; stateCode: string };
  intraState: boolean;
  paymentMethod: PaymentMethod;
  lines: { description: string; hsn: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; gstRate: number; total: number }[];
  totals: { taxable: number; cgst: number; sgst: number; igst: number; total: number };
  amountInWords: string;
  notes: string;
}

export interface CustomerDTO {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  registered: boolean;
  isB2B: boolean;
  orderCount: number;
  lifetimeValue: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface LeadDTO {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  items: { productId: string; title: string; qty: number; price: number }[];
  value: number;
  stage: LeadStage;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponDTO {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  value: number;
  maxDiscount: number | null;
  minOrder: number | null;
  usageLimit: number | null;
  perPhoneLimit: number | null;
  prepaidOnly: boolean;
  allowCod: boolean;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  showBanner: boolean;
  bannerTitle: string | null;
  bannerSubtitle: string | null;
  used: number;
  discountGiven: number;
  state: 'ACTIVE' | 'SCHEDULED' | 'ENDED' | 'PAUSED';
}

export interface ServiceAreaDTO {
  id: string;
  city: string;
  state: string;
  pincodePrefixes: string[];
  etaDays: number;
  cod: boolean;
  shippingFee: number | null;
  active: boolean;
}

export interface SettingsDTO {
  storeName: string;
  legalName: string;
  gstin: string;
  storeState: string;
  storeAddress: string;
  supportPhone: string;
  supportEmail: string;
  codEnabled: boolean;
  codFee: number;
  codMaxOrder: number;
  codMinOrder: number;
  prepaidDiscountPct: number;
  freeShippingOver: number;
  shippingFee: number;
  onlinePaymentsEnabled: boolean;
  announcement: string;
  disclaimer: string;
}

export interface ReportSummaryDTO {
  from: string;
  to: string;
  netSales: number;
  cogs: number;
  grossProfit: number;
  gstOutput: number;
  orders: number;
  monthly: { month: string; revenue: number; cogs: number; orders: number }[];
  byCategory: { categoryId: string; name: string; revenue: number; profit: number; margin: number }[];
}

/** Server-sent event payload for live updates. */
export interface OrderLiveEvent {
  type: 'order.status' | 'order.created' | 'order.updated';
  orderNo: string;
  status: OrderStatus;
  at: string;
}
