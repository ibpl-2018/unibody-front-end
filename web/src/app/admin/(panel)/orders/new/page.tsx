'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { PAYMENT_METHOD_LABEL, formatINR, isValidPhone, normalizePhone, type PaymentMethod, type QuoteDTO } from '@unibody/shared';
import { Button, Field, Input, Segmented, Select } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { FormGrid, PageHeader, Panel } from '@/components/admin/ui';
import { ProductPicker, type PickedProduct } from '@/components/admin/product-picker';
import { NoAccess } from '@/components/admin/no-access';
import { adminApi, errMsg, useDebounced } from '@/lib/admin/api';
import { useAdmin } from '@/lib/admin/session';

interface Line {
  key: number;
  product: PickedProduct | null;
  qty: string;
}
type PayMode = 'COD' | 'LINK' | 'PAID';
let k = 0;
const newLine = (): Line => ({ key: ++k, product: null, qty: '1' });
const ONLINE: PaymentMethod[] = ['UPI', 'CARD', 'NETBANKING'];

/** Staff-created order for phone / WhatsApp / walk-in customers. Same pricing, stock and COD rules as checkout. */
export default function NewOrderPage() {
  const router = useRouter();
  const toast = useToast();
  const { can } = useAdmin();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [coupon, setCoupon] = useState('');
  const [mode, setMode] = useState<PayMode>('COD');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [ref, setRef] = useState('');
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const items = lines.filter((l) => l.product && Number(l.qty) > 0).map((l) => ({ productId: l.product!.id, qty: Math.round(Number(l.qty)) }));
  const payMethod: PaymentMethod = mode === 'COD' ? 'COD' : method;
  const quoteKey = useDebounced(JSON.stringify({ items, pincode, coupon: coupon.trim(), payMethod }), 300);

  // Pincode → city/state (same serviceability lookup as checkout)
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pincode)) return;
    let live = true;
    adminApi.store
      .serviceability(pincode)
      .then((r) => {
        if (!live) return;
        if (r.city) setCity(r.city);
        if (r.state) setState(r.state);
        setErrors((e) => ({ ...e, pincode: r.serviceable ? '' : 'We don’t deliver to this pincode yet' }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pincode]);

  // Live quote
  useEffect(() => {
    const q = JSON.parse(quoteKey) as { items: { productId: string; qty: number }[]; pincode: string; coupon: string; payMethod: PaymentMethod };
    if (!q.items.length) return setQuote(null);
    let live = true;
    adminApi.store
      .quote({ items: q.items, pincode: /^[1-9]\d{5}$/.test(q.pincode) ? q.pincode : undefined, couponCode: q.coupon || undefined, paymentMethod: q.payMethod })
      .then((r) => live && setQuote(r))
      .catch(() => live && setQuote(null));
    return () => {
      live = false;
    };
  }, [quoteKey]);

  if (!can('orderCreate')) return <NoAccess what="order creation" />;

  const upd = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const codBlocked = mode === 'COD' && quote && !quote.codAllowed ? quote.codBlockedReason ?? 'Cash on Delivery isn’t available for this order' : null;

  async function submit() {
    const e: Record<string, string> = {};
    if (!isValidPhone(phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (name.trim().length < 2) e.name = 'Enter the customer’s full name';
    if (!/^[1-9]\d{5}$/.test(pincode)) e.pincode = 'Enter a 6-digit pincode';
    if (city.trim().length < 2) e.city = 'Enter the city';
    if (state.trim().length < 2) e.state = 'Enter the state';
    if (line1.trim().length < 3) e.line1 = 'Enter flat / house / building';
    if (line2.trim().length < 3) e.line2 = 'Enter area / street';
    if (!items.length) e.items = 'Add at least one product';
    if (codBlocked) e.payment = codBlocked;
    if (quote?.unavailable.length) e.items = 'Some items are unavailable — see the summary';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return toast(Object.values(e).find(Boolean)!, 'error');
    setBusy(true);
    try {
      const r = await adminApi.admin.createOrder({
        phone: normalizePhone(phone),
        name: name.trim(),
        email: email.trim() || undefined,
        address: { line1: line1.trim(), line2: line2.trim(), landmark: landmark.trim() || undefined, pincode, city: city.trim(), state: state.trim() },
        items,
        couponCode: coupon.trim() || undefined,
        paymentMethod: payMethod,
        paidOffline: mode === 'PAID',
        paymentRef: mode === 'PAID' ? ref.trim() : undefined,
      });
      if (r.payUrl) {
        await navigator.clipboard?.writeText(r.payUrl).catch(() => {});
        toast(`${r.orderNo} created — payment link copied, send it to the customer`);
      } else toast(`${r.orderNo} created`);
      router.replace(`/admin/orders/${r.id}`);
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: '/admin/orders', label: 'Orders' }}
        title="New order"
        subtitle="For phone, WhatsApp or walk-in customers. Stock is reserved as soon as it’s created."
        actions={
          <Button onClick={submit} loading={busy}>
            Create order
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel title="Customer">
            <FormGrid>
              <Field label="Mobile number" error={errors.phone}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ''))} inputMode="tel" placeholder="98765 43210" invalid={!!errors.phone} />
              </Field>
              <Field label="Full name" error={errors.name}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" invalid={!!errors.name} />
              </Field>
              <Field label="Email (optional)" className="sm:col-span-2">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="for the invoice" />
              </Field>
            </FormGrid>
          </Panel>
          <Panel title="Delivery address">
            <FormGrid>
              <Field label="Pincode" error={errors.pincode}>
                <Input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="560034" invalid={!!errors.pincode} />
              </Field>
              <Field label="City" error={errors.city}>
                <Input value={city} onChange={(e) => setCity(e.target.value)} invalid={!!errors.city} />
              </Field>
              <Field label="State" error={errors.state}>
                <Input value={state} onChange={(e) => setState(e.target.value)} invalid={!!errors.state} />
              </Field>
              <Field label="Landmark (optional)">
                <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} />
              </Field>
              <Field label="Flat / House no. / Building" error={errors.line1} className="sm:col-span-2">
                <Input value={line1} onChange={(e) => setLine1(e.target.value)} invalid={!!errors.line1} />
              </Field>
              <Field label="Area / Street / Locality" error={errors.line2} className="sm:col-span-2">
                <Input value={line2} onChange={(e) => setLine2(e.target.value)} invalid={!!errors.line2} />
              </Field>
            </FormGrid>
          </Panel>
          <Panel title="Items">
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={l.key} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px_auto]">
                  <ProductPicker value={l.product} onChange={(p) => upd(l.key, { product: p })} invalid={!!errors.items && !l.product} />
                  <Input aria-label="Quantity" value={l.qty} onChange={(e) => upd(l.key, { qty: e.target.value.replace(/\D/g, '') })} inputMode="numeric" />
                  {lines.length > 1 ? (
                    <button type="button" aria-label="Remove item" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="self-center rounded-full p-2 text-muted hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              {errors.items && <p className="text-xs text-danger">{errors.items}</p>}
              <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine()])}>
                <Plus className="size-4" />
                Add item
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Payment">
            <Segmented
              className="w-full"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'COD', label: 'COD' },
                { value: 'LINK', label: 'Pay link' },
                { value: 'PAID', label: 'Already paid' },
              ]}
            />
            <p className="mt-3 text-xs text-muted">
              {mode === 'COD'
                ? 'Customer pays the courier on delivery.'
                : mode === 'LINK'
                  ? 'A secure payment link is copied when the order is created — send it on WhatsApp. Unpaid orders release stock after 45 minutes.'
                  : 'Payment already received (UPI to the shop, card machine, bank transfer). The order starts as Confirmed.'}
            </p>
            {mode !== 'COD' && (
              <div className="mt-4 space-y-4">
                <Field label="Method">
                  <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {ONLINE.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABEL[m]}
                      </option>
                    ))}
                  </Select>
                </Field>
                {mode === 'PAID' && (
                  <Field label="Payment reference" hint="UPI / bank reference — recorded on the order timeline">
                    <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 4012 7788 9921" />
                  </Field>
                )}
              </div>
            )}
            {errors.payment && <p className="mt-3 text-xs text-danger">{errors.payment}</p>}
            <Field label="Coupon (optional)" className="mt-4" error={quote?.couponError ?? undefined}>
              <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="FESTIVE20" />
            </Field>
          </Panel>
          <Panel title="Summary">
            {!quote ? (
              <p className="text-sm text-muted">Add items to see the total.</p>
            ) : (
              <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular-nums">
                <dt className="text-muted">Subtotal ({quote.itemCount})</dt>
                <dd className="text-right">{formatINR(quote.subtotal)}</dd>
                {quote.couponDiscount > 0 && (
                  <>
                    <dt className="text-muted">Coupon {quote.couponCode}</dt>
                    <dd className="text-right text-success">−{formatINR(quote.couponDiscount)}</dd>
                  </>
                )}
                {quote.prepaidDiscount > 0 && (
                  <>
                    <dt className="text-muted">Prepaid discount</dt>
                    <dd className="text-right text-success">−{formatINR(quote.prepaidDiscount)}</dd>
                  </>
                )}
                <dt className="text-muted">Shipping</dt>
                <dd className="text-right">{quote.shipping ? formatINR(quote.shipping) : 'Free'}</dd>
                {quote.codFee > 0 && (
                  <>
                    <dt className="text-muted">COD fee</dt>
                    <dd className="text-right">{formatINR(quote.codFee)}</dd>
                  </>
                )}
                <dt className="mt-2 border-t border-line-subtle pt-2 font-semibold">Total</dt>
                <dd className="mt-2 border-t border-line-subtle pt-2 text-right text-lg font-semibold">{formatINR(quote.total)}</dd>
                {codBlocked && <dd className="col-span-2 mt-2 text-xs text-danger">{codBlocked}</dd>}
                {quote.unavailable.map((u) => (
                  <dd key={u.productId} className="col-span-2 text-xs text-danger">
                    {lines.find((l) => l.product?.id === u.productId)?.product?.title ?? 'Item'}: {u.reason}
                  </dd>
                ))}
              </dl>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
