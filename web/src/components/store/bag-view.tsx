'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { AlertCircle, Lock, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { CONDITION_LABEL, formatINR, type Condition } from '@unibody/shared';
import { ButtonLink, EmptyState, ProductImage, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCart } from '@/lib/store/cart';
import { useStoreConfig } from '@/lib/store/config';
import { useQuote } from '@/lib/store/use-quote';
import { Breakdown, CouponField } from './summary';

export function BagView() {
  const { cart, ready, items, setQty, remove, setCoupon, patchLine } = useCart();
  const config = useStoreConfig();
  const { quote, loading, error } = useQuote({ items, couponCode: cart.couponCode, pincode: cart.pincode });

  const unavailable = new Map((quote?.unavailable ?? []).map((u) => [u.productId, u.reason]));

  // Keep cached prices in sync with the server quote
  useEffect(() => {
    if (!quote) return;
    for (const ql of quote.lines) {
      const l = cart.lines.find((x) => x.productId === ql.productId);
      if (l && l.price !== ql.unitPrice) patchLine(l.productId, { price: ql.unitPrice });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  if (!ready) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (cart.lines.length === 0) {
    return (
      <div className="rounded-[var(--radius-tile)] bg-bg-2">
        <EmptyState icon={<ShoppingBag className="size-6" />} title="Your bag is empty" body="Find the right part for your device in three taps." action={<ButtonLink href="/#finder">Find parts for my device</ButtonLink>} />
      </div>
    );
  }
  const blocked = cart.lines.some((l) => unavailable.has(l.productId));
  const prepaidSave = quote && config.onlinePaymentsEnabled ? quote.total - quote.prepaidTotal : 0;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <ul className="divide-y divide-line-subtle rounded-[var(--radius-tile)] border border-line-subtle bg-surface">
        {cart.lines.map((l) => {
          const why = unavailable.get(l.productId);
          return (
            <li key={l.productId} className={cn('flex gap-4 p-4 sm:p-5', why && 'bg-danger-soft/40')}>
              <Link href={`/p/${l.slug}`} className="shrink-0">
                <ProductImage src={l.image} alt="" tint={l.icon} className="size-20 sm:size-24" rounded="rounded-2xl" imgClassName="p-2" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/p/${l.slug}`} className="line-clamp-2 text-[15px] font-semibold leading-snug hover:underline">
                      {l.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {CONDITION_LABEL[l.condition as Condition] ?? l.condition} · {l.fitsLabel.split(' · ')[0]}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="block text-[15px] font-semibold tabular-nums">{formatINR(l.price * l.qty)}</span>
                    {l.qty > 1 && <span className="text-xs text-subtle">{formatINR(l.price)} each</span>}
                  </p>
                </div>
                {why && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger" role="alert">
                    <AlertCircle className="size-3.5" /> {why} — remove it to continue
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex h-9 items-center rounded-full border border-line" role="group" aria-label={`Quantity for ${l.title}`}>
                    <button type="button" onClick={() => setQty(l.productId, l.qty - 1)} aria-label="Decrease quantity" className="flex size-9 items-center justify-center rounded-full">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-medium tabular-nums">{l.qty}</span>
                    <button type="button" onClick={() => setQty(l.productId, l.qty + 1)} disabled={l.qty >= l.maxQty} aria-label="Increase quantity" className="flex size-9 items-center justify-center rounded-full disabled:opacity-40">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(l.productId)} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-danger">
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="rounded-[var(--radius-tile)] bg-bg-2 p-5 sm:p-6 lg:sticky lg:top-20" aria-label="Order summary">
        <h2 className="text-[19px] font-semibold">Summary</h2>
        <div className="mt-4">
          <CouponField code={cart.couponCode} quote={quote} onApply={setCoupon} />
        </div>
        <div className="mt-5">
          <Breakdown quote={quote} lines={cart.lines} loading={loading} />
        </div>
        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        {prepaidSave > 0 && (
          <p className="mt-3 rounded-xl bg-purple-soft px-3 py-2 text-xs font-medium text-purple">
            Pay online at checkout and save another {formatINR(prepaidSave)} ({config.prepaidDiscountPct}% prepaid discount).
          </p>
        )}
        <ButtonLink href="/checkout" size="lg" className={cn('mt-5 w-full', blocked && 'pointer-events-none opacity-50')} aria-disabled={blocked}>
          <Lock className="size-4" /> Checkout
        </ButtonLink>
        <ul className="mt-4 space-y-1.5 text-xs text-muted">
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-3.5" /> Warranty on every part
          </li>
          <li className="flex items-center gap-2">
            <RotateCcw className="size-3.5" /> 7-day returns if it doesn’t fit
          </li>
          {config.codEnabled && (
            <li className="flex items-center gap-2">
              <Lock className="size-3.5" /> Cash on Delivery up to {formatINR(config.codMaxOrder)}
            </li>
          )}
        </ul>
      </aside>
    </div>
  );
}
