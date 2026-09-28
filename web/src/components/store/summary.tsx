'use client';
import { useState } from 'react';
import { Check, Tag, X } from 'lucide-react';
import { formatINR, type CartLine, type QuoteDTO } from '@unibody/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { gstIncluded } from '@/lib/store/use-quote';
import { useStoreConfig } from '@/lib/store/config';

export function CouponField({ code, quote, onApply }: { code: string | null; quote: QuoteDTO | null; onApply: (c: string | null) => void }) {
  const [value, setValue] = useState('');
  const config = useStoreConfig();
  const applied = !!code && quote?.couponCode === code;
  const error = code && quote?.couponError ? quote.couponError : null;

  if (code && !error) {
    return (
      <div className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5">
        <Tag className="size-4 text-muted" />
        <span className="flex-1 text-[15px] font-medium tracking-wide">{code}</span>
        {applied ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
            <Check className="size-3" /> Applied
          </span>
        ) : (
          <span className="text-xs text-subtle">Checking…</span>
        )}
        <button type="button" onClick={() => onApply(null)} aria-label={`Remove coupon ${code}`} className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-2">
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onApply(value.trim().toUpperCase());
        }}
      >
        <label htmlFor="coupon" className="sr-only">
          Coupon code
        </label>
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
          <Tag className="size-4 shrink-0 text-muted" />
          <input id="coupon" value={value} onChange={(e) => setValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Coupon code" className="h-full min-w-0 flex-1 bg-transparent text-[15px] uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-subtle" />
        </div>
        <Button type="submit" variant="secondary" className="h-11">
          Apply
        </Button>
      </form>
      {error ? (
        <p className="mt-1.5 flex items-center justify-between text-xs text-danger" role="alert">
          {error}
          <button type="button" className="text-muted underline" onClick={() => onApply(null)}>
            Remove
          </button>
        </p>
      ) : (
        config.banner && (
          <button type="button" onClick={() => onApply(config.banner!.code)} className="mt-1.5 text-xs text-link hover:underline">
            Try {config.banner.code} — {config.banner.title.replace(/\.$/, '')}
          </button>
        )
      )}
    </div>
  );
}

function Row({ label, value, tone, small }: { label: React.ReactNode; value: React.ReactNode; tone?: 'success' | 'muted'; small?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', small ? 'text-xs text-subtle' : 'text-sm')}>
      <dt className={small ? '' : 'text-muted'}>{label}</dt>
      <dd className={cn('font-medium tabular-nums', tone === 'success' && 'text-success', small && 'font-normal')}>{value}</dd>
    </div>
  );
}

/** Price breakdown from a server quote. */
export function Breakdown({ quote, lines, loading }: { quote: QuoteDTO | null; lines: CartLine[]; loading?: boolean }) {
  const subtotal = quote?.subtotal ?? lines.reduce((a, l) => a + l.price * l.qty, 0);
  const itemCount = quote?.itemCount ?? lines.reduce((a, l) => a + l.qty, 0);
  const mrpSaving = lines.reduce((a, l) => a + (l.mrp && l.mrp > l.price ? (l.mrp - l.price) * l.qty : 0), 0);
  const total = quote?.total ?? subtotal;
  const saved = mrpSaving + (quote?.couponDiscount ?? 0) + (quote?.prepaidDiscount ?? 0);
  return (
    <div className={cn('transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
      <dl className="space-y-2.5">
        <Row label={`Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})`} value={formatINR(subtotal)} />
        {quote && quote.couponDiscount > 0 && <Row label={`Coupon (${quote.couponCode})`} value={formatINR(-quote.couponDiscount)} tone="success" />}
        {quote && quote.prepaidDiscount > 0 && <Row label="Prepaid discount" value={formatINR(-quote.prepaidDiscount)} tone="success" />}
        <Row label="Delivery" value={!quote ? '—' : quote.shipping === 0 ? 'Free' : formatINR(quote.shipping)} tone={quote?.shipping === 0 ? 'success' : undefined} />
        {quote && quote.codFee > 0 && <Row label="Cash on Delivery fee" value={formatINR(quote.codFee)} />}
        <Row small label="GST (included)" value={formatINR(gstIncluded(total - (quote?.shipping ?? 0) - (quote?.codFee ?? 0)))} />
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-line-subtle pt-4">
        <span className="text-[17px] font-semibold">Total</span>
        <span className="text-[22px] font-bold tracking-tight tabular-nums">{formatINR(total)}</span>
      </div>
      {saved > 0 && <p className="mt-1 text-xs font-medium text-success">You save {formatINR(saved)} vs MRP</p>}
    </div>
  );
}
