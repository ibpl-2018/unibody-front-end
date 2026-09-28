import type { ApprovalStatus, OrderStatus } from './constants';
import type {
  AddressInput,
  AdminPlaceOrderInput,
  CartItemInput,
  CouponInput,
  PlaceOrderInput,
  ProductInput,
  QuoteInput,
  SettingsInput,
} from './schemas';
import type {
  AdminLoginResponse,
  ApprovalDTO,
  AuditEntryDTO,
  AuditVerifyDTO,
  HeldResponseDTO,
  ReconciliationDTO,
  SecurityAlertDTO,
  SecurityOverviewDTO,
  SecuritySettingsDTO,
  StockCountDTO,
  StockCountScanDTO,
  AdminPlaceOrderResponse,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminProductDTO,
  AdminProductListItem,
  PaymentInfoDTO,
  AdminUserDTO,
  CategoryDTO,
  CouponDTO,
  CustomerDTO,
  DashboardDTO,
  DeviceFamilyDTO,
  DeviceModelDTO,
  InventoryRowDTO,
  InventorySummaryDTO,
  InvoiceDTO,
  LeadDTO,
  OrderPublicDTO,
  OtpSendResponse,
  OtpVerifyResponse,
  Paged,
  PlaceOrderResponse,
  ProductCardDTO,
  ProductDetailDTO,
  ProductListDTO,
  PurchaseDTO,
  QuoteDTO,
  ReportSummaryDTO,
  ServiceAreaDTO,
  ServiceabilityDTO,
  SettingsDTO,
  StockMovementDTO,
  StockUnitDTO,
  StoreConfigDTO,
  SupplierDTO,
} from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the bearer token to send (customer OTP token or admin token). */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

type Query = Record<string, string | number | boolean | undefined | null | string[]>;

function qs(q?: Query): string {
  if (!q) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(x)}`));
    else parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function createApiClient(opts: ApiClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, '');
  const f = opts.fetch ?? fetch;

  async function request<T>(method: string, path: string, body?: unknown, query?: Query, tokenOverride?: string): Promise<T> {
    const token = tokenOverride ?? (opts.getToken ? await opts.getToken() : null);
    const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers ?? {}) };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await f(`${base}${path}${qs(query)}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const err = data && typeof data === 'object' ? data : {};
      throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? `Request failed (${res.status})`, err.fields);
    }
    return data as T;
  }

  const get = <T>(p: string, q?: Query) => request<T>('GET', p, undefined, q);
  const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
  const put = <T>(p: string, b?: unknown) => request<T>('PUT', p, b ?? {});
  const patch = <T>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {});
  const del = <T>(p: string) => request<T>('DELETE', p);

  return {
    request,
    baseUrl: base,

    // ---------- Storefront (public) ----------
    store: {
      config: () => get<StoreConfigDTO>('/api/store/config'),
      families: (withModels = true) => get<DeviceFamilyDTO[]>('/api/catalog/families', { models: withModels }),
      family: (slug: string) => get<DeviceFamilyDTO>(`/api/catalog/families/${slug}`),
      categories: () => get<CategoryDTO[]>('/api/catalog/categories'),
      findModel: (q: string) => get<DeviceModelDTO[]>('/api/catalog/models', { q }),
      model: (id: string) => get<DeviceModelDTO>(`/api/catalog/models/${id}`),
      products: (q: {
        family?: string;
        model?: string;
        category?: string;
        condition?: string[];
        colour?: string[];
        /** Keyboard layout filter: 'US' | 'UK' | 'IN' */
        layout?: string[];
        q?: string;
        minPrice?: number;
        maxPrice?: number;
        inStock?: boolean;
        cod?: boolean;
        featured?: boolean;
        sort?: 'recommended' | 'price_asc' | 'price_desc' | 'newest';
        page?: number;
        pageSize?: number;
      } = {}) => get<ProductListDTO>('/api/products', q as Query),
      product: (slug: string) => get<ProductDetailDTO>(`/api/products/${slug}`),
      checkFit: (productId: string, aNumber: string) => get<{ fits: boolean; model: DeviceModelDTO | null; message: string }>(`/api/products/${productId}/fit`, { aNumber }),
      serviceability: (pincode: string) => get<ServiceabilityDTO>(`/api/serviceability/${pincode}`),
      quote: (body: QuoteInput) => post<QuoteDTO>('/api/cart/quote', body),
      sendOtp: (phone: string) => post<OtpSendResponse>('/api/otp/send', { phone }),
      verifyOtp: (phone: string, code: string) => post<OtpVerifyResponse>('/api/otp/verify', { phone, code }),
      saveLead: (body: { name?: string; items: CartItemInput[]; pincode?: string }) => post<{ id: string }>('/api/leads', body),
      placeOrder: (body: PlaceOrderInput) => post<PlaceOrderResponse>('/api/orders', body),
      paymentInfo: (orderNo: string, phone: string) => get<PaymentInfoDTO>(`/api/pay/${encodeURIComponent(orderNo)}`, { phone }),
      verifyPayment: (body: { orderNo: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        post<{ ok: true; paymentStatus: string }>('/api/payments/razorpay/verify', body),
      track: (orderNo: string, phone: string) => get<OrderPublicDTO>('/api/orders/track', { orderNo, phone }),
      /** URL for Server-Sent Events stream of live status changes */
      trackStreamUrl: (orderNo: string, phone: string) => `${base}/api/orders/${encodeURIComponent(orderNo)}/events${qs({ phone })}`,
      cancelOrder: (orderNo: string, phone: string, reason?: string) => post<OrderPublicDTO>(`/api/orders/${encodeURIComponent(orderNo)}/cancel`, { phone, reason }),
      myOrders: () => get<OrderPublicDTO[]>('/api/me/orders'),
      saveAccount: (body: { name?: string; email?: string; address?: AddressInput }) => post<{ registered: true; couponCode: string | null }>('/api/me/save', body),
    },

    // ---------- Admin ----------
    admin: {
      login: (email: string, password: string) => post<AdminLoginResponse>('/api/admin/auth/login', { email, password }),
      me: () => get<AdminUserDTO>('/api/admin/me'),
      eventsUrl: (token: string) => `${base}/api/admin/events${qs({ token })}`,
      dashboard: (days = 30) => get<DashboardDTO>('/api/admin/dashboard', { days }),

      orders: (q: { status?: OrderStatus | 'ALL'; q?: string; payment?: string; city?: string; page?: number; pageSize?: number } = {}) =>
        get<Paged<AdminOrderListItem> & { counts: Record<string, number>; /** distinct delivery cities (newer API builds) */ cities?: string[] }>('/api/admin/orders', q as Query),
      order: (id: string) => get<AdminOrderDetail>(`/api/admin/orders/${id}`),
      createOrder: (body: AdminPlaceOrderInput) => post<AdminPlaceOrderResponse>('/api/admin/orders', body),
      /** Risky moves by non-owners may come back held (see isHeld). */
      setStatus: (id: string, status: OrderStatus, note?: string) => post<AdminOrderDetail | HeldResponseDTO>(`/api/admin/orders/${id}/status`, { status, note }),
      scanUnit: (id: string, code: string) => post<AdminOrderDetail>(`/api/admin/orders/${id}/scan`, { code }),
      unscanUnit: (id: string, unitId: string) => del<AdminOrderDetail>(`/api/admin/orders/${id}/scan/${unitId}`),
      bulkStatus: (ids: string[], status: OrderStatus) => post<{ updated: number; failed: { id: string; message: string }[] }>('/api/admin/orders/bulk-status', { ids, status }),
      addNote: (id: string, note: string) => post<AdminOrderDetail>(`/api/admin/orders/${id}/notes`, { note }),
      assignUnit: (id: string, itemId: string, unitId: string) => post<AdminOrderDetail>(`/api/admin/orders/${id}/assign-unit`, { itemId, unitId }),
      setShipment: (id: string, body: { courier: string; awb: string; trackingUrl?: string }) => post<AdminOrderDetail>(`/api/admin/orders/${id}/shipment`, body),
      markCodCollected: (id: string) => post<AdminOrderDetail>(`/api/admin/orders/${id}/cod-collected`),
      generateInvoice: (id: string) => post<AdminOrderDetail | HeldResponseDTO>(`/api/admin/orders/${id}/invoice`),

      products: (q: { q?: string; family?: string; category?: string; condition?: string; status?: string; stock?: 'low' | 'out'; page?: number; pageSize?: number } = {}) =>
        get<Paged<AdminProductListItem>>('/api/admin/products', q as Query),
      product: (id: string) => get<AdminProductDTO>(`/api/admin/products/${id}`),
      createProduct: (body: ProductInput) => post<AdminProductDTO>('/api/admin/products', body),
      updateProduct: (id: string, body: Partial<ProductInput>) => put<AdminProductDTO | HeldResponseDTO>(`/api/admin/products/${id}`, body),
      setProductStatus: (id: string, status: 'ACTIVE' | 'HIDDEN' | 'DRAFT') => patch<AdminProductDTO>(`/api/admin/products/${id}/status`, { status }),
      duplicateProduct: (id: string) => post<AdminProductDTO>(`/api/admin/products/${id}/duplicate`),
      deleteProduct: (id: string) => del<{ ok: true } | HeldResponseDTO>(`/api/admin/products/${id}`),

      families: () => get<DeviceFamilyDTO[]>('/api/admin/catalog/families'),
      createFamily: (b: unknown) => post<DeviceFamilyDTO>('/api/admin/catalog/families', b),
      updateFamily: (id: string, b: unknown) => put<DeviceFamilyDTO>(`/api/admin/catalog/families/${id}`, b),
      models: (familyId?: string) => get<DeviceModelDTO[]>('/api/admin/catalog/models', { familyId }),
      createModel: (b: unknown) => post<DeviceModelDTO>('/api/admin/catalog/models', b),
      updateModel: (id: string, b: unknown) => put<DeviceModelDTO>(`/api/admin/catalog/models/${id}`, b),
      deleteModel: (id: string) => del<{ ok: true }>(`/api/admin/catalog/models/${id}`),
      categories: () => get<CategoryDTO[]>('/api/admin/catalog/categories'),
      createCategory: (b: unknown) => post<CategoryDTO>('/api/admin/catalog/categories', b),
      updateCategory: (id: string, b: unknown) => put<CategoryDTO>(`/api/admin/catalog/categories/${id}`, b),

      inventory: (q: { q?: string; state?: 'OK' | 'LOW' | 'OUT'; page?: number; pageSize?: number } = {}) =>
        get<Paged<InventoryRowDTO> & { summary: InventorySummaryDTO }>('/api/admin/inventory', q as Query),
      units: (q: { productId?: string; status?: string; q?: string; page?: number } = {}) => get<Paged<StockUnitDTO>>('/api/admin/inventory/units', q as Query),
      movements: (q: { productId?: string; type?: string; page?: number } = {}) => get<Paged<StockMovementDTO>>('/api/admin/inventory/movements', q as Query),
      addUnit: (b: { productId: string; serial: string; grade?: string; bin?: string }) => post<StockUnitDTO>('/api/admin/inventory/units', b),
      /** Upload a product image (multipart). Returns the stored relative path and its public URL. */
      upload: async (file: Blob, filename: string) => {
        const fd = new FormData();
        fd.append('file', file, filename);
        const token = opts.getToken ? await opts.getToken() : null;
        const res = await f(`${base}/api/admin/uploads`, { method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(res.status, data.code ?? 'ERROR', data.message ?? 'Upload failed');
        return data as { path: string; url: string };
      },
      adjustStock: (b: { productId: string; qty: number; reason: string; unitCost?: number; unitCodes?: string[] }) => post<InventoryRowDTO | HeldResponseDTO>('/api/admin/inventory/adjust', b),

      // ---- inventory control & anti-theft ----
      stockCounts: () => get<StockCountDTO[]>('/api/admin/stock-counts'),
      stockCount: (id: string) => get<StockCountDTO>(`/api/admin/stock-counts/${id}`),
      startStockCount: (b: { productIds?: string[]; categoryId?: string; note?: string }) => post<StockCountDTO>('/api/admin/stock-counts', b),
      scanStockCount: (id: string, code: string) => post<{ outcome: StockCountScanDTO['outcome']; count: StockCountDTO }>(`/api/admin/stock-counts/${id}/scan`, { code }),
      submitStockCount: (id: string) => post<StockCountDTO>(`/api/admin/stock-counts/${id}/submit`),
      closeStockCount: (id: string, b: { writeOffUnitIds: string[]; note?: string }) => post<StockCountDTO | HeldResponseDTO>(`/api/admin/stock-counts/${id}/close`, b),
      securityOverview: () => get<SecurityOverviewDTO>('/api/admin/security/overview'),
      updateSecuritySettings: (b: Partial<SecuritySettingsDTO>) => put<SecuritySettingsDTO>('/api/admin/security/settings', b),
      approvals: (q: { status?: ApprovalStatus | 'ALL'; page?: number } = {}) => get<Paged<ApprovalDTO>>('/api/admin/security/approvals', q as Query),
      decideApproval: (id: string, decision: 'APPROVE' | 'REJECT', note?: string) => post<ApprovalDTO>(`/api/admin/security/approvals/${id}/decide`, { decision, note }),
      securityAlerts: (q: { status?: 'OPEN' | 'RESOLVED' | 'ALL'; page?: number } = {}) => get<Paged<SecurityAlertDTO>>('/api/admin/security/alerts', q as Query),
      resolveAlert: (id: string, note: string) => post<SecurityAlertDTO>(`/api/admin/security/alerts/${id}/resolve`, { note }),
      reconciliation: () => get<ReconciliationDTO>('/api/admin/security/reconciliation'),
      auditLog: (q: { page?: number; action?: string; actorId?: string; entity?: string; entityId?: string } = {}) => get<Paged<AuditEntryDTO>>('/api/admin/security/audit', q as Query),
      verifyAudit: () => get<AuditVerifyDTO>('/api/admin/security/audit/verify'),

      suppliers: () => get<SupplierDTO[]>('/api/admin/suppliers'),
      createSupplier: (b: unknown) => post<SupplierDTO>('/api/admin/suppliers', b),
      updateSupplier: (id: string, b: unknown) => put<SupplierDTO>(`/api/admin/suppliers/${id}`, b),
      purchases: (q: { page?: number } = {}) => get<Paged<PurchaseDTO> & { summary: { last30: number; payable: number; donorsInHarvest: number } }>('/api/admin/purchases', q as Query),
      purchase: (id: string) => get<PurchaseDTO>(`/api/admin/purchases/${id}`),
      createPurchase: (b: unknown) => post<PurchaseDTO>('/api/admin/purchases', b),
      receivePurchase: (id: string) => post<PurchaseDTO>(`/api/admin/purchases/${id}/receive`),
      recordPurchasePayment: (id: string, amount: number) => post<PurchaseDTO>(`/api/admin/purchases/${id}/payments`, { amount }),
      harvest: (id: string, b: { lineId: string; label?: string; parts: { productId: string; qty: number; cost: number; serial?: string | null }[] }) =>
        post<PurchaseDTO>(`/api/admin/purchases/${id}/harvest`, b),

      invoices: (q: { q?: string; page?: number } = {}) => get<Paged<{ id: string; invoiceNo: string; orderNo: string; date: string; customerName: string; total: number }>>('/api/admin/invoices', q as Query),
      invoice: (id: string) => get<InvoiceDTO>(`/api/admin/invoices/${id}`),

      customers: (q: { q?: string; type?: 'guest' | 'registered' | 'b2b'; page?: number } = {}) =>
        get<Paged<CustomerDTO> & { summary: { total: number; guestPct: number; repeatRate: number } }>('/api/admin/customers', q as Query),
      customer: (id: string) => get<CustomerDTO & { orders: AdminOrderListItem[]; addresses: AddressDTOWithId[] }>(`/api/admin/customers/${id}`),
      updateCustomer: (id: string, b: { name?: string; isB2B?: boolean; email?: string }) => put<CustomerDTO>(`/api/admin/customers/${id}`, b),
      leads: (q: { stage?: string; page?: number } = {}) => get<Paged<LeadDTO> & { summary: { open: number; openValue: number; conversion: number } }>('/api/admin/leads', q as Query),
      setLeadStage: (id: string, stage: string, note?: string) => patch<LeadDTO>(`/api/admin/leads/${id}`, { stage, note }),

      coupons: () => get<CouponDTO[]>('/api/admin/coupons'),
      createCoupon: (b: CouponInput) => post<CouponDTO>('/api/admin/coupons', b),
      updateCoupon: (id: string, b: Partial<CouponInput>) => put<CouponDTO>(`/api/admin/coupons/${id}`, b),

      reportSummary: (q: { from?: string; to?: string } = {}) => get<ReportSummaryDTO>('/api/admin/reports/summary', q as Query),
      /** CSV download URLs (append ?token= for auth in a plain link) */
      reportCsvUrl: (kind: 'sales' | 'gst' | 'inventory' | 'purchases' | 'cod' | 'pnl', q: { from?: string; to?: string; token?: string } = {}) =>
        `${base}/api/admin/reports/${kind}.csv${qs(q as Query)}`,

      settings: () => get<SettingsDTO>('/api/admin/settings'),
      updateSettings: (b: SettingsInput) => put<SettingsDTO>('/api/admin/settings', b),
      serviceAreas: () => get<ServiceAreaDTO[]>('/api/admin/service-areas'),
      createServiceArea: (b: unknown) => post<ServiceAreaDTO>('/api/admin/service-areas', b),
      updateServiceArea: (id: string, b: unknown) => put<ServiceAreaDTO>(`/api/admin/service-areas/${id}`, b),
      staff: () => get<AdminUserDTO[]>('/api/admin/staff'),
      createStaff: (b: unknown) => post<AdminUserDTO>('/api/admin/staff', b),
      updateStaff: (id: string, b: unknown) => put<AdminUserDTO>(`/api/admin/staff/${id}`, b),
    },
  };
}

type AddressDTOWithId = import('./types').AddressDTO & { id: string };
export type ApiClient = ReturnType<typeof createApiClient>;
export type { ProductCardDTO };

/** True when a change was held for the Super Admin's approval (VISIBLE mode) instead of applied. */
export const isHeld = (r: unknown): r is HeldResponseDTO => !!r && typeof r === 'object' && (r as { held?: unknown }).held === true;
