'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Gift, MessageCircle, PackageSearch, Sparkles } from 'lucide-react';
import { ApiError, formatINR, type OrderPublicDTO } from '@unibody/shared';
import { Button, ButtonLink, Field, Input, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { fmtWeekday } from '@/lib/format';
import { useSession } from '@/lib/store/session';
import { useStoreConfig } from '@/lib/store/config';
import { rememberOrder, trackHref } from '@/lib/store/recent-orders';
import { waLink } from '@/lib/store/catalog';
import { AddressBlock, OrderItems } from './parts';

const CONFETTI = ['bg-vivid-blue', 'bg-vivid-pink', 'bg-vivid-yellow', 'bg-vivid-green', 'bg-vivid-purple', 'bg-vivid-orange'];

function SaveDetails({ order }: { order: OrderPublicDTO }) {
  const { session, update } = useSession();
  const toast = useToast();
  const [name, setName] = useState(order.customerName);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState<string | null | undefined>(undefined);
  if (!session || (session.registered && coupon === undefined)) return null;

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
    <section className="gradient-aurora rounded-[var(--radius-tile)] p-[1.5px]" aria-labelledby="save">
      <form onSubmit={save} className="rounded-[calc(var(--radius-tile)-1px)] bg-surface p-5 sm:p-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-purple-soft px-2.5 py-0.5 text-xs font-semibold text-purple">
          <Sparkles className="size-3.5" /> ₹200 off your next order
        </p>
        <h2 id="save" className="mt-3 text-[19px] font-semibold">
          Save your details
        </h2>
        <p className="mt-1 text-sm text-muted">Skip the typing next time and see all your orders in one place. We’ll send a welcome code.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="s-name">
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Email (optional)" htmlFor="s-email">
            <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
        </div>
        <Button type="submit" className="mt-4" loading={busy}>
          Save & get code
        </Button>
      </form>
    </section>
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
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-56 rounded-[26px]" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const cod = order.paymentMethod === 'COD';
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="hero-glow relative overflow-hidden rounded-[28px] px-6 py-10 text-center text-hero-fg sm:py-14">
        {fresh &&
          Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`pb-confetti absolute top-0 block h-2.5 w-1.5 rounded-sm ${CONFETTI[i % CONFETTI.length]}`}
              style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s`, transform: `rotate(${i * 29}deg)` }}
            />
          ))}
        <span className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-success text-white shadow-[0_0_0_10px_rgb(48_209_88/0.15)]">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h1 className="relative mt-5 text-[30px] font-bold tracking-tight sm:text-[40px]">{fresh ? 'Order placed!' : 'Your order'}</h1>
        <p className="relative mt-2 text-[15px] text-hero-muted">
          Order <strong className="text-hero-fg">#{order.orderNo}</strong>
          {order.etaDate && order.status !== 'CANCELLED' ? ` · Arriving ${fmtWeekday(order.etaDate)}` : ''}
        </p>
        <p className="relative mx-auto mt-3 max-w-md text-sm text-hero-muted">
          {cod
            ? `We’ll confirm by a quick call or WhatsApp before dispatch. Keep ${formatINR(order.totals.total)} ready — cash or UPI to the courier.`
            : order.paymentStatus === 'PAID'
              ? 'Payment received. We’re picking and testing your parts now.'
              : 'We’re waiting for your payment to go through.'}
        </p>
        <div className="relative mt-6 flex flex-wrap justify-center gap-2">
          <Link href={trackHref(order.orderNo, phone)} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hover">
            <PackageSearch className="size-4" /> Track order
          </Link>
          <Link href="/shop" className="inline-flex h-10 items-center rounded-full bg-hero-surface px-5 text-sm font-medium text-hero-fg hover:opacity-90">
            Continue shopping
          </Link>
        </div>
      </section>

      <p className="flex items-center justify-center gap-2 text-center text-[13px] text-muted">
        <MessageCircle className="size-4 text-success" /> Updates for this order go to WhatsApp on {order.phoneMasked}.{' '}
        <a href={waLink(config.whatsapp, `Hi Unibody, about order ${order.orderNo}`)} target="_blank" rel="noreferrer" className="text-link hover:underline">
          Message us
        </a>
      </p>

      <SaveDetails order={order} />

      <section className="rounded-[var(--radius-tile)] border border-line-subtle bg-surface p-5 sm:p-6" aria-labelledby="summary">
        <h2 id="summary" className="mb-4 text-[17px] font-semibold">
          Order summary
        </h2>
        <OrderItems order={order} />
        <div className="mt-5 border-t border-line-subtle pt-5">
          <AddressBlock order={order} />
        </div>
      </section>
      <style>{`@keyframes pb-fall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(340px) rotate(540deg);opacity:0}}.pb-confetti{animation:pb-fall 2.4s ease-in forwards}@media (prefers-reduced-motion:reduce){.pb-confetti{display:none}}`}</style>
    </div>
  );
}
