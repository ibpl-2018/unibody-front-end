'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Building2, Check, CreditCard, Info, Lock, MessageCircle, RotateCcw, ShieldCheck, ShoppingBag, Smartphone } from 'lucide-react';
import { ApiError, addressSchema, CONDITION_SHORT, formatINR, gstinSchema, isValidPhone, type Condition, type PaymentMethod, type ServiceabilityDTO } from '@unibody/shared';
import { Button, ButtonLink, Checkbox, EmptyState, Field, Input, ProductImage, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { fmtWeekday } from '@/lib/format';
import { useCart } from '@/lib/store/cart';
import { useStoreConfig } from '@/lib/store/config';
import { useSession } from '@/lib/store/session';
import { useQuote } from '@/lib/store/use-quote';
import { rememberOrder } from '@/lib/store/recent-orders';
import { OtpDialog, PhoneInput } from '../otp';
import { Breakdown, CouponField } from '../summary';

type Label = 'HOME' | 'WORK' | 'SHOP';
type Errors = Partial<Record<'name' | 'phone' | 'email' | 'pincode' | 'city' | 'state' | 'line1' | 'line2' | 'gstin' | 'payment', string>>;

function Step({ n, title, done, action, children }: { n: number; title: string; done?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-5 sm:p-6" aria-labelledby={`step-${n}`}>
      <div className="mb-5 flex items-center gap-3">
        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold', done ? 'bg-success text-white' : 'bg-fg text-bg')} aria-hidden>
          {done ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
        <h2 id={`step-${n}`} className="flex-1 text-[19px] font-semibold tracking-tight">
          {title}
          {done && <span className="sr-only"> (complete)</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const PAY_OPTIONS: { value: PaymentMethod; title: string; sub: string; icon: typeof Smartphone }[] = [
  { value: 'UPI', title: 'UPI', sub: 'Google Pay, PhonePe, Paytm, BHIM — instant', icon: Smartphone },
  { value: 'CARD', title: 'Credit / Debit card', sub: 'Visa, Mastercard, RuPay · EMI on orders over ₹3,000', icon: CreditCard },
  { value: 'NETBANKING', title: 'Net banking', sub: 'All major Indian banks', icon: Building2 },
];

export function CheckoutView() {
  const router = useRouter();
  const toast = useToast();
  const config = useStoreConfig();
  const { cart, ready, items, setCoupon, setPincode, clear } = useCart();
  const { session, ready: sessionReady, signOut } = useSession();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState(true);
  const [otpOpen, setOtpOpen] = useState(false);

  const [pincode, setPin] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [label, setLabel] = useState<Label>('HOME');
  const [wantGst, setWantGst] = useState(false);
  const [gstin, setGstin] = useState('');
  const [area, setArea] = useState<ServiceabilityDTO | null>(null);
  const [areaErr, setAreaErr] = useState<string | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  const [method, setMethod] = useState<PaymentMethod>(config.onlinePaymentsEnabled ? 'UPI' : 'COD');
  const [errors, setErrors] = useState<Errors>({});
  const [placing, setPlacing] = useState(false);
  const placed = useRef(false);
  const prefilled = useRef(false);

  const verified = !!session && session.phone === phone && isValidPhone(phone);
  const { quote, loading } = useQuote({ items, couponCode: cart.couponCode, paymentMethod: method, pincode: area?.serviceable ? area.pincode : null }, ready && cart.lines.length > 0);

  // Prefill from the signed-in session and remembered pincode
  useEffect(() => {
    if (!sessionReady || !ready || prefilled.current) return;
    prefilled.current = true;
    if (session) {
      setPhone(session.phone);
      if (session.name) setName(session.name);
      const a = session.addresses[0];
      if (a) {
        setLine1(a.line1);
        setLine2(a.line2);
        setLandmark(a.landmark ?? '');
        setLabel(a.label);
        setPin(a.pincode);
        setCity(a.city);
        setStateName(a.state);
        return;
      }
    }
    if (cart.pincode) setPin(cart.pincode);
  }, [sessionReady, ready, session, cart.pincode]);

  // Pincode → city/state + serviceability
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      setArea(null);
      setAreaErr(null);
      return;
    }
    let live = true;
    setCheckingPin(true);
    api.store
      .serviceability(pincode)
      .then((r) => {
        if (!live) return;
        setArea(r);
        setAreaErr(r.serviceable ? null : 'Sorry, we don’t deliver to this pincode yet.');
        if (r.city) setCity(r.city);
        if (r.state) setStateName(r.state);
        setPincode(pincode);
      })
      .catch((e) => live && setAreaErr(e instanceof ApiError ? e.message : 'Couldn’t check this pincode'))
      .finally(() => live && setCheckingPin(false));
    return () => {
      live = false;
    };
  }, [pincode, setPincode]);

  // Fall back to prepaid when COD becomes unavailable
  const codDisabledReason = !config.codEnabled ? 'Cash on Delivery is paused right now' : area && !area.cod ? 'Cash on Delivery isn’t available for this pincode' : quote && !quote.codAllowed ? quote.codBlockedReason : null;
  useEffect(() => {
    if (method === 'COD' && codDisabledReason && config.onlinePaymentsEnabled) setMethod('UPI');
  }, [method, codDisabledReason, config.onlinePaymentsEnabled]);

  const address = { line1, line2, landmark, pincode, city, state: stateName, label };
  const addressOk = useMemo(() => addressSchema.safeParse(address).success && !!area?.serviceable, [line1, line2, landmark, pincode, city, stateName, label, area]); // eslint-disable-line react-hooks/exhaustive-deps
  const contactOk = verified && name.trim().length >= 2;
  const unavailable = quote?.unavailable ?? [];

  const requestOtp = () => {
    if (!isValidPhone(phone)) {
      setErrors((e) => ({ ...e, phone: 'Enter a valid 10-digit mobile number' }));
      return;
    }
    setErrors((e) => ({ ...e, phone: undefined }));
    setOtpOpen(true);
  };

  const onVerified = () => {
    setOtpOpen(false);
    toast('Mobile verified');
    // Abandoned-cart lead so the team can help if checkout isn't finished
    api.store.saveLead({ name: name.trim() || undefined, items, pincode: /^\d{6}$/.test(pincode) ? pincode : undefined }).catch(() => {});
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = 'Enter your full name';
    if (!isValidPhone(phone)) e.phone = 'Enter a valid 10-digit mobile number';
    else if (!verified) e.phone = 'Verify your mobile number to continue';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email or leave it blank';
    const a = addressSchema.safeParse(address);
    if (!a.success) for (const i of a.error.issues) e[i.path[0] as keyof Errors] ??= i.message;
    if (!e.pincode && areaErr) e.pincode = areaErr;
    if (wantGst && !gstinSchema.safeParse(gstin).success) e.gstin = 'Enter a valid 15-character GSTIN';
    if (method === 'COD' && codDisabledReason) e.payment = codDisabledReason;
    return e;
  };

  const placeOrder = async () => {
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast(Object.values(e).find(Boolean)!, 'error');
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (unavailable.length) {
      toast('Some items in your bag are no longer available', 'error');
      return;
    }
    setPlacing(true);
    try {
      const res = await api.store.placeOrder({
        name: name.trim(),
        email: email.trim() || undefined,
        address: { ...address, landmark: landmark.trim() || undefined },
        items,
        couponCode: quote?.couponCode ?? undefined,
        paymentMethod: method,
        whatsappOptIn: whatsapp,
        gstin: wantGst ? gstin.trim().toUpperCase() : undefined,
        source: 'WEB',
      });
      placed.current = true;
      rememberOrder({ orderNo: res.orderNo, phone, status: res.status, total: res.total });
      clear();
      if (res.paymentMethod === 'COD' || !res.razorpay) router.replace(`/order/${res.orderNo}?phone=${phone}&new=1`);
      else router.replace(`/pay/${res.orderNo}?phone=${phone}`);
    } catch (err) {
      setPlacing(false);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          signOut();
          setErrors({ phone: 'Your verification expired — please verify again' });
        }
        if (err.fields) setErrors((x) => ({ ...x, ...Object.fromEntries(Object.entries(err.fields!).map(([k, v]) => [k.replace(/^address\./, ''), v])) }));
        toast(err.message, 'error');
      } else toast('Couldn’t place the order. Check your connection and try again.', 'error');
    }
  };

  if (!ready) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Skeleton className="h-60" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (cart.lines.length === 0 && !placed.current) {
    return (
      <div className="rounded-[var(--radius-tile)] bg-bg-2">
        <EmptyState icon={<ShoppingBag className="size-6" />} title="Your bag is empty" body="Add a part to your bag to check out." action={<ButtonLink href="/shop">Shop parts</ButtonLink>} />
      </div>
    );
  }
  if (placed.current) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <span className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <p className="text-sm text-muted">{method === 'COD' ? 'Placing your order…' : 'Taking you to secure payment…'}</p>
      </div>
    );
  }

  const payLabel = quote ? formatINR(quote.total) : '';
  const prepaidOff = quote && method === 'COD' ? quote.total - quote.prepaidTotal : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
      <div className="space-y-4">
        {/* 1. Contact */}
        <Step
          n={1}
          title="Contact"
          done={contactOk}
          action={
            verified ? (
              <button
                type="button"
                className="text-[13px] font-medium text-link hover:underline"
                onClick={() => {
                  signOut();
                  setPhone('');
                }}
              >
                Edit
              </button>
            ) : null
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="c-name" error={errors.name}>
              <Input id="c-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} placeholder="Rahul Sharma" />
            </Field>
            <Field label="Mobile number" htmlFor="c-phone" error={errors.phone} hint={!verified ? 'We’ll send a 6-digit code to verify — no account needed.' : undefined}>
              <PhoneInput
                id="c-phone"
                value={phone}
                onChange={(v) => setPhone(v)}
                disabled={verified}
                invalid={!!errors.phone}
                right={
                  verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                      <Check className="size-3" /> Verified
                    </span>
                  ) : (
                    <Button type="button" size="sm" variant={isValidPhone(phone) ? 'primary' : 'secondary'} onClick={requestOtp} className="h-7 px-3 text-xs">
                      Verify
                    </Button>
                  )
                }
              />
            </Field>
            <Field label="Email (optional — for invoice)" htmlFor="c-email" error={errors.email} className="sm:col-span-2">
              <Input id="c-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} placeholder="you@example.com" />
            </Field>
          </div>
          <Checkbox
            className="mt-4"
            checked={whatsapp}
            onChange={(e) => setWhatsapp(e.target.checked)}
            label={
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="size-4 text-success" /> Send order updates on WhatsApp
              </span>
            }
          />
        </Step>

        {/* 2. Address */}
        <Step n={2} title="Delivery address" done={addressOk}>
          {session && session.addresses.length > 1 && (
            <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
              {session.addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setLine1(a.line1);
                    setLine2(a.line2);
                    setLandmark(a.landmark ?? '');
                    setLabel(a.label);
                    setPin(a.pincode);
                  }}
                  className={cn('shrink-0 rounded-xl border px-3 py-2 text-left text-xs', line1 === a.line1 && pincode === a.pincode ? 'border-accent bg-accent-soft/50' : 'border-line-subtle hover:border-line')}
                >
                  <span className="font-semibold">{a.label[0] + a.label.slice(1).toLowerCase()}</span> · {a.line1}, {a.pincode}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Pincode" htmlFor="a-pin" error={errors.pincode ?? areaErr} className="col-span-2 sm:col-span-1">
              <Input id="a-pin" inputMode="numeric" autoComplete="postal-code" value={pincode} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} invalid={!!(errors.pincode || areaErr)} placeholder="560034" />
            </Field>
            <Field label="City" htmlFor="a-city" error={errors.city}>
              <Input id="a-city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} invalid={!!errors.city} />
            </Field>
            <Field label="State" htmlFor="a-state" error={errors.state}>
              <Input id="a-state" autoComplete="address-level1" value={stateName} onChange={(e) => setStateName(e.target.value)} invalid={!!errors.state} />
            </Field>
          </div>
          {checkingPin ? (
            <p className="mt-1.5 text-xs text-muted">Checking delivery…</p>
          ) : area?.serviceable ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-success">
              <Check className="size-3.5" /> {[area.city, area.state].filter(Boolean).join(', ')} · {area.cod ? 'COD available' : 'Prepaid only'} · Delivery by {area.etaDate ? fmtWeekday(area.etaDate) : `${area.etaDays} days`}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4">
            <Field label="Flat / House no. / Building" htmlFor="a-l1" error={errors.line1}>
              <Input id="a-l1" autoComplete="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} invalid={!!errors.line1} />
            </Field>
            <Field label="Area / Street / Locality" htmlFor="a-l2" error={errors.line2}>
              <Input id="a-l2" autoComplete="address-line2" value={line2} onChange={(e) => setLine2(e.target.value)} invalid={!!errors.line2} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="Landmark (optional)" htmlFor="a-lm">
                <Input id="a-lm" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
              </Field>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-muted" id="save-as">
                  Save as
                </span>
                <div className="flex gap-2" role="radiogroup" aria-labelledby="save-as">
                  {(['HOME', 'WORK', 'SHOP'] as Label[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={label === l}
                      onClick={() => setLabel(l)}
                      className={cn('h-11 rounded-xl border px-4 text-sm transition', label === l ? 'border-accent font-medium ring-2 ring-accent/20' : 'border-line hover:bg-surface-2')}
                    >
                      {l[0] + l.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Checkbox className="mt-4" checked={wantGst} onChange={(e) => setWantGst(e.target.checked)} label="I need a GST invoice (add GSTIN)" />
          {wantGst && (
            <Field label="GSTIN" htmlFor="a-gst" error={errors.gstin} className="mt-3 sm:max-w-xs">
              <Input id="a-gst" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))} invalid={!!errors.gstin} placeholder="29ABCDE1234F1Z5" className="uppercase tracking-wide" />
            </Field>
          )}
        </Step>

        {/* 3. Payment */}
        <Step n={3} title="Payment">
          <div className="space-y-2.5" role="radiogroup" aria-label="Payment method">
            {config.onlinePaymentsEnabled &&
              PAY_OPTIONS.map((o) => (
                <PayOption key={o.value} checked={method === o.value} onSelect={() => setMethod(o.value)} icon={o.icon} title={o.title} sub={o.sub} tag={config.prepaidDiscountPct > 0 ? <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">Extra {config.prepaidDiscountPct}% off</span> : null} />
              ))}
            {config.codEnabled && (
              <PayOption
                checked={method === 'COD'}
                onSelect={() => setMethod('COD')}
                disabled={!!codDisabledReason}
                icon={Banknote}
                title="Cash on Delivery"
                sub={codDisabledReason ?? `Pay cash or UPI to the courier. ${formatINR(config.codFee)} COD fee · up to ${formatINR(config.codMaxOrder)}`}
                tag={<span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">+{formatINR(config.codFee)}</span>}
              />
            )}
          </div>
          {errors.payment && <p className="mt-2 text-xs text-danger">{errors.payment}</p>}
          {method === 'COD' ? (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted">
              <Info className="mt-px size-3.5 shrink-0" /> COD orders are confirmed by a quick call/WhatsApp from our team before dispatch.
              {prepaidOff > 0 && <span className="font-medium text-purple"> Pay online to save {formatINR(prepaidOff)}.</span>}
            </p>
          ) : (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted">
              <Lock className="mt-px size-3.5 shrink-0" /> You’ll complete payment on the next screen, secured by Razorpay.
            </p>
          )}
        </Step>
      </div>

      {/* Summary */}
      <aside className="rounded-[var(--radius-tile)] bg-bg-2 p-5 sm:p-6 lg:sticky lg:top-6" aria-label="Your order">
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-semibold">Your order</h2>
          <Link href="/bag" className="text-[13px] text-link hover:underline">
            Edit bag
          </Link>
        </div>
        <ul className="mt-4 space-y-3 border-b border-line-subtle pb-4">
          {cart.lines.map((l) => {
            const bad = unavailable.find((u) => u.productId === l.productId);
            return (
              <li key={l.productId} className="flex items-center gap-3">
                <ProductImage src={l.image} alt="" tint={l.icon} className="size-12 shrink-0" rounded="rounded-xl" imgClassName="p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{l.title}</p>
                  <p className={cn('text-xs', bad ? 'text-danger' : 'text-muted')}>{bad ? bad.reason : `Qty ${l.qty} · ${CONDITION_SHORT[l.condition as Condition] ?? l.condition}`}</p>
                </div>
                <span className="text-[13px] font-medium tabular-nums">{formatINR(l.price * l.qty)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <CouponField code={cart.couponCode} quote={quote} onApply={setCoupon} />
        </div>
        <div className="mt-5">
          <Breakdown quote={quote} lines={cart.lines} loading={loading} />
        </div>
        <Button size="lg" className="mt-5 w-full" onClick={placeOrder} loading={placing} disabled={!quote || unavailable.length > 0}>
          {!placing && <Lock className="size-4" />}
          {method === 'COD' ? `Place order${payLabel ? ` · ${payLabel}` : ''}` : `Pay ${payLabel} securely`}
        </Button>
        {!contactOk && <p className="mt-2 text-center text-xs text-muted">Verify your mobile to place the order.</p>}
        <p className="mt-3 text-center text-[11px] leading-relaxed text-subtle">
          By placing the order you agree to our{' '}
          <Link href="/help/terms" className="underline">
            Terms of Sale
          </Link>{' '}
          &{' '}
          <Link href="/help/returns" className="underline">
            Returns Policy
          </Link>
          .
        </p>
        <ul className="mt-4 space-y-1.5 text-xs text-muted">
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-3.5" /> Warranty on every part
          </li>
          <li className="flex items-center gap-2">
            <RotateCcw className="size-3.5" /> 7-day returns if it doesn’t fit
          </li>
          <li className="flex items-center gap-2">
            <Lock className="size-3.5" /> Payments secured by Razorpay
          </li>
        </ul>
      </aside>

      <OtpDialog phone={phone} open={otpOpen} onClose={() => setOtpOpen(false)} onVerified={onVerified} />
    </div>
  );
}

function PayOption({ checked, onSelect, disabled, icon: Icon, title, sub, tag }: { checked: boolean; onSelect: () => void; disabled?: boolean; icon: typeof Smartphone; title: string; sub: string; tag?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition',
        checked ? 'border-accent bg-accent-soft/60 ring-2 ring-accent/20' : 'border-line-subtle hover:border-line',
        disabled && 'cursor-not-allowed opacity-55',
      )}
    >
      <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2', checked ? 'border-accent' : 'border-line')} aria-hidden>
        {checked && <span className="size-2.5 rounded-full bg-accent" />}
      </span>
      <Icon className="size-5 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className={cn('block text-xs', disabled ? 'text-danger' : 'text-muted')}>{sub}</span>
      </span>
      {tag}
    </button>
  );
}
