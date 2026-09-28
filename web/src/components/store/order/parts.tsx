'use client';
import { Check, Package } from 'lucide-react';
import { CONDITION_SHORT, formatINR, ORDER_FLOW, PAYMENT_METHOD_LABEL, STATUS_LABEL, type OrderPublicDTO } from '@unibody/shared';
import { ProductImage } from '@/components/ui';
import { cn } from '@/lib/cn';
import { fmtDateTime } from '@/lib/format';

/** Horizontal (desktop) / vertical (mobile) progress timeline over ORDER_FLOW. */
export function Timeline({ order }: { order: OrderPublicDTO }) {
  const idx = ORDER_FLOW.indexOf(order.status);
  const at = (s: string) => {
    const e = [...order.events].reverse().find((x) => x.status === s);
    return e ? fmtDateTime(e.at) : null;
  };
  if (idx < 0) return null;
  return (
    <ol className="grid grid-cols-1 gap-0 sm:grid-cols-6" aria-label="Order progress">
      {ORDER_FLOW.map((s, i) => {
        const done = i <= idx;
        const current = i === idx + 1 && order.status !== 'DELIVERED';
        const time = at(s);
        return (
          <li key={s} className="relative flex items-start gap-3 pb-5 last:pb-0 sm:flex-col sm:items-center sm:gap-2 sm:pb-0 sm:text-center" aria-current={i === idx ? 'step' : undefined}>
            {/* connector */}
            {i < ORDER_FLOW.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[13px] top-7 h-[calc(100%-28px)] w-[2px] sm:left-[calc(50%+14px)] sm:top-[13px] sm:h-[2px] sm:w-[calc(100%-28px)]',
                  i < idx ? 'bg-success' : 'bg-line',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2',
                done ? 'border-success bg-success text-white' : current ? 'border-success bg-surface' : 'border-line bg-surface',
              )}
            >
              {done && <Check className="size-4" strokeWidth={3} />}
            </span>
            <div>
              <p className={cn('text-[13px]', done ? 'font-semibold' : 'text-muted')}>{STATUS_LABEL[s]}</p>
              <p className="text-[11px] text-subtle">{time ?? (current && order.etaDate && s === 'OUT_FOR_DELIVERY' ? 'Expected soon' : '')}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ order, compact }: { order: OrderPublicDTO; compact?: boolean }) {
  const paid = order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_COLLECTED';
  const t = order.totals;
  return (
    <div>
      <ul className="space-y-3">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-center gap-3">
            <ProductImage src={it.image} alt="" tint={it.icon} className="size-12 shrink-0" rounded="rounded-xl" imgClassName="p-1" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{it.title}</p>
              <p className="text-xs text-muted">
                {CONDITION_SHORT[it.condition]}
                {it.qty > 1 ? ` · Qty ${it.qty}` : ''}
              </p>
            </div>
            <span className="text-[13px] font-medium tabular-nums">{formatINR(it.lineTotal)}</span>
          </li>
        ))}
      </ul>
      {!compact && (
        <dl className="mt-4 space-y-1.5 border-t border-line-subtle pt-4 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatINR(t.subtotal)}</dd>
          </div>
          {t.couponDiscount > 0 && (
            <div className="flex justify-between text-success">
              <dt>Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd className="tabular-nums">{formatINR(-t.couponDiscount)}</dd>
            </div>
          )}
          {t.prepaidDiscount > 0 && (
            <div className="flex justify-between text-success">
              <dt>Prepaid discount</dt>
              <dd className="tabular-nums">{formatINR(-t.prepaidDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="tabular-nums">{t.shipping ? formatINR(t.shipping) : 'Free'}</dd>
          </div>
          {t.codFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">COD fee</dt>
              <dd className="tabular-nums">{formatINR(t.codFee)}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="mt-3 flex items-baseline justify-between border-t border-line-subtle pt-3">
        <span className="text-[13px] font-medium text-muted">
          {paid ? 'Paid' : order.paymentMethod === 'COD' ? 'To pay on delivery' : 'Payment pending'} ({order.paymentMethod === 'COD' ? 'COD' : PAYMENT_METHOD_LABEL[order.paymentMethod]})
        </span>
        <span className="text-[17px] font-bold tabular-nums">{formatINR(t.total)}</span>
      </div>
    </div>
  );
}

export function AddressBlock({ order }: { order: OrderPublicDTO }) {
  const a = order.address;
  return (
    <div className="flex gap-3 text-[13px]">
      <Package className="mt-0.5 size-4 shrink-0 text-muted" />
      <p className="text-muted">
        <span className="font-medium text-fg">{order.customerName}</span> · {order.phoneMasked}
        <br />
        {a.line1}, {a.line2}
        {a.landmark ? `, ${a.landmark}` : ''}
        <br />
        {a.city}, {a.state} {a.pincode}
      </p>
    </div>
  );
}
