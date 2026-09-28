'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Clock, Copy, Gift, MessageCircle, Truck } from 'lucide-react';
import { ApiError, formatINR, PAYMENT_METHOD_LABEL, type OrderPublicDTO } from '@unibody/shared';
import { cn } from '@/lib/cn';
import { Button, ButtonLink, Field, Input, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { fmtWeekday } from '@/lib/format';
import { useSession } from '@/lib/store/session';
import { useStoreConfig } from '@/lib/store/config';
import { rememberOrder, trackHref } from '@/lib/store/recent-orders';
import { waLink } from '@/lib/store/catalog';
import { OrderItems, Timeline } from './parts';

const CONFETTI = ['bg-vivid-blue', 'bg-vivid-pink', 'bg-vivid-yellow', 'bg-vivid-green', 'bg-vivid-purple', 'bg-vivid-orange'];

function SaveDetails({ order }: { order: OrderPublicDTO }) {
  const { session, update } = useSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState(order.customerName);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState<string | null | undefined>(undefined);
  if (!session || dismissed || (session.registered && coupon === undefined)) return null;

  if (coupon !== undefined) {
    return (
      <section className="rounded-[var(--radius-tile)] bg-success-soft p-5 sm:p-6" role="status">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Check className="size-5" /> Details saved
        </p>
        <p className="mt-1 text-sm text-muted">Next time checkout takes seconds.</p>
        {coupon && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm">
            <Gift className="size-4 text-purple" /> Use <strong className="tracking-wide">{coupon}</strong> for ₹200 off your next order
          </p>
        )}
      </section>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const a = order.address;
      const r = await api.store.saveAccount({ name: name.trim() || undefined, email: email.trim() || undefined, address: { line1: a.line1, line2: a.line2, landmark: a.landmark ?? '', pincode: a.pincode, city: a.city, state: a.state, label: a.label } });
      update({ registered: true, name: name.trim() || session.name });
      setCoupon(r.couponCode);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Couldn’t save right now', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-tile)] bg-surface-2 p-5 sm:p-6" aria-labelledby="save">
      <form onSubmit={save}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface">
            <Gift className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="save" className="text-[17px] font-semibold leading-snug">
              Save your details for next time? Get ₹200 off your next order.
            </h2>
            <p className="mt-1 text-sm text-muted">Optional. One tap — we already have your verified number. See all orders in one place.</p>
          </div>
          {!open && (
            <div className="flex shrink-0 items-center gap-4">
              <Button type="button" variant="dark" onClick={() => setOpen(true)}>
                Save & get ₹200
              </Button>
              <button type="button" className="text-sm text-link hover:underline" onClick={() => setDismissed(true)}>
                No thanks
              </button>
            </div>
          )}
        </div>
        {open && (
          <div className="mt-5 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Name" htmlFor="s-name">
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
            </Field>
            <Field label="Email (optional)" htmlFor="s-email">
              <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Button type="submit" variant="dark" loading={busy}>
              Save & get code
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}

function CopyOrderNo({ orderNo }: { orderNo: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? 'Order number copied' : 'Copy order number'}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
      onClick={() =>
        navigator.clipboard?.writeText(orderNo).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        })
      }>
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
    </button>
  );
}

export function Confirmation({ orderNo, phone, fresh }: { orderNo: string; phone: string; fresh: boolean }) {
  const config = useStoreConfig();
  const [order, setOrder] = useState<OrderPublicDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!phone) {
      setError('This link is missing the mobile number.');
      return;
    }
    api.store
      .track(orderNo, phone)
      .then((o) => {
        setOrder(o);
        rememberOrder({ orderNo: o.orderNo, phone, status: o.status, total: o.totals.total });
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Couldn’t load your order.'));
  }, [orderNo, phone]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold">We couldn’t open this order</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <ButtonLink href="/track" className="mt-6">
          Track an order
        </ButtonLink>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="mx-auto size-20 rounded-full" />
        <Skeleton className="mx-auto h-10 w-2/3" />
        <Skeleton className="h-64 rounded-[26px]" />
      </div>
    );
  }

  const cod = order.paymentMethod === 'COD';
  const paid = order.paymentStatus === 'PAID';
  const unpaid = !cod && !paid;
  const first = order.customerName.trim().split(/\s+/)[0];
  const eta = order.etaDate && order.status !== 'CANCELLED' ? fmtWeekday(order.etaDate) : null;
  const a = order.address;
  return (
    <div className="relative mx-auto max-w-4xl space-y-7">
      {fresh &&
        Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`pb-confetti pointer-events-none absolute top-0 block h-2.5 w-1.5 rounded-sm ${CONFETTI[i % CONFETTI.length]}`}
            style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s`, transform: `rotate(${i * 29}deg)` }}
          />
        ))}
      <header className="pt-4 text-center">
        <span
          className={cn(
            'mx-auto flex size-20 items-center justify-center rounded-full text-white',
            unpaid ? 'bg-warning shadow-[0_12px_40px_rgb(255_149_0/0.35)]' : 'bg-gradient-to-br from-vivid-green to-vivid-blue shadow-[0_12px_40px_rgb(48_209_88/0.35)]',
          )}>
          {unpaid ? <Clock className="size-9" strokeWidth={2.5} /> : <Check className="size-10" strokeWidth={3} />}
        </span>
        <h1 className="mt-6 text-balance text-[30px] font-bold tracking-tight sm:text-[40px]">
          {unpaid ? 'Almost there — complete your payment' : fresh ? `Thank you, ${first}. Your order is placed.` : 'Your order'}
        </h1>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[17px] text-muted">
          Order <strong className="text-fg">#{order.orderNo}</strong>
          <CopyOrderNo orderNo={order.orderNo} />
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-[15px] text-muted">
          {cod
            ? `We’ll confirm by a quick call or WhatsApp on ${order.phoneMasked}. Keep ${formatINR(order.totals.total)} ready — cash or UPI to the courier.`
            : paid
              ? `We’ve sent the details by SMS & WhatsApp to ${order.phoneMasked}.`
              : 'We’re waiting for your payment to go through.'}
          {eta ? ` Arriving ${eta}.` : ''}
        </p>
      </header>

      <section className="rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-5 sm:p-8" aria-label="Order status">
        <Timeline order={order} />
        <div className="mt-6 grid gap-6 border-t border-line-subtle pt-6 sm:grid-cols-2">
          <div className="text-[13px]">
            <p className="text-muted">Delivering to</p>
            <p className="mt-1 text-[15px] font-semibold">
              {order.customerName} · {order.phoneMasked}
            </p>
            <p className="mt-1 text-muted">
              {a.line1}, {a.line2}
              {a.landmark ? `, ${a.landmark}` : ''}, {a.city} {a.pincode}
            </p>
          </div>
          <div className="text-[13px]">
            <p className="text-muted">Payment</p>
            <p className="mt-1 text-[15px] font-semibold">
              {PAYMENT_METHOD_LABEL[order.paymentMethod]} · {cod ? `Pay ${formatINR(order.totals.total)} on delivery` : paid ? `Paid ${formatINR(order.totals.total)}` : `${formatINR(order.totals.total)} pending`}
            </p>
            <p className="mt-1 text-muted">GST invoice is sent when your order ships.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href={trackHref(order.orderNo, phone)} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[17px] font-medium text-on-accent hover:bg-accent-hover">
          <Truck className="size-5" /> Track order
        </Link>
        <a
          href={waLink(config.whatsapp, `Hi Unibody, about order ${order.orderNo}`)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-surface-2 px-7 text-[17px] font-medium hover:bg-line-subtle">
          <MessageCircle className="size-5 text-success" /> Message us
        </a>
        <Link href="/shop" className="inline-flex h-12 items-center px-5 text-[17px] text-link hover:underline">
          Continue shopping
        </Link>
      </div>

      <SaveDetails order={order} />

      <details className="group rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-5 sm:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[17px] font-semibold">
          Order summary · {order.items.reduce((n, i) => n + i.qty, 0)} item(s)
          <span className="text-sm font-normal text-link group-open:hidden">Show</span>
          <span className="hidden text-sm font-normal text-link group-open:inline">Hide</span>
        </summary>
        <div className="mt-4">
          <OrderItems order={order} />
        </div>
      </details>
      <style>{`@keyframes pb-fall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(340px) rotate(540deg);opacity:0}}.pb-confetti{animation:pb-fall 2.4s ease-in forwards}@media (prefers-reduced-motion:reduce){.pb-confetti{display:none}}`}</style>
    </div>
  );
}
