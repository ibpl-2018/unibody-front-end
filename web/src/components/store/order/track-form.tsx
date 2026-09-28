'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight, Clock, X } from 'lucide-react';
import { formatINR, isValidPhone, maskPhone, normalizePhone } from '@unibody/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { fmtDateShort } from '@/lib/format';
import { forgetOrder, getRecentOrders, trackHref, type RecentOrder } from '@/lib/store/recent-orders';

/** Order no + mobile → /track/[orderNo]?phone= */
export function TrackForm({ defaultOrderNo = '', defaultPhone = '', compact, className }: { defaultOrderNo?: string; defaultPhone?: string; compact?: boolean; className?: string }) {
  const router = useRouter();
  const [orderNo, setOrderNo] = useState(defaultOrderNo);
  const [phone, setPhone] = useState(defaultPhone);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setOrderNo(defaultOrderNo), [defaultOrderNo]);
  useEffect(() => setPhone(defaultPhone), [defaultPhone]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const no = orderNo.trim().toUpperCase();
    if (no.length < 6) return setErr('Enter your order number, e.g. UB-260927-1042');
    if (!isValidPhone(phone)) return setErr('Enter the 10-digit mobile used for the order');
    setErr(null);
    router.push(trackHref(no, normalizePhone(phone)));
  };

  return (
    <form onSubmit={submit} className={className} noValidate>
      <div className={cn('flex flex-col gap-2', compact ? 'sm:flex-row' : 'sm:flex-row')}>
        <label htmlFor="t-no" className="sr-only">
          Order number
        </label>
        <input
          id="t-no"
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
          placeholder="Order no. (UB-260927-1042)"
          autoComplete="off"
          className="h-11 w-full min-w-0 shrink-0 rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-48 sm:flex-1"
        />
        <label htmlFor="t-phone" className="sr-only">
          Mobile number
        </label>
        <div className="flex h-11 w-full min-w-0 shrink-0 items-center rounded-xl border border-line bg-surface focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 sm:w-44">
          <span className="pl-3.5 pr-2 text-[15px] text-muted">+91</span>
          <input id="t-phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 10))} placeholder="98765 43210" className="h-full min-w-0 flex-1 bg-transparent pr-3 text-[15px] outline-none" />
        </div>
        <Button type="submit" variant="dark" className="h-11">
          Track
        </Button>
      </div>
      {err && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}

export function RecentOrders() {
  const [list, setList] = useState<RecentOrder[]>([]);
  useEffect(() => setList(getRecentOrders()), []);
  if (!list.length) return null;
  return (
    <section className="mt-10" aria-labelledby="recent">
      <h2 id="recent" className="flex items-center gap-2 text-[15px] font-semibold">
        <Clock className="size-4 text-muted" /> Recently tracked on this device
      </h2>
      <ul className="mt-3 divide-y divide-line-subtle rounded-[var(--radius-card)] border border-line-subtle bg-surface">
        {list.map((o) => (
          <li key={o.orderNo} className="flex items-center gap-2 pr-2">
            <Link href={trackHref(o.orderNo, o.phone)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{o.orderNo}</span>
                <span className="block text-xs text-muted">
                  {maskPhone(o.phone)} · {fmtDateShort(o.at)}
                  {o.total ? ` · ${formatINR(o.total)}` : ''}
                </span>
              </span>
              <ChevronRight className="size-4 text-subtle" />
            </Link>
            <button
              type="button"
              aria-label={`Forget ${o.orderNo}`}
              onClick={() => {
                forgetOrder(o.orderNo);
                setList(getRecentOrders());
              }}
              className="inline-flex size-8 items-center justify-center rounded-full text-subtle hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
