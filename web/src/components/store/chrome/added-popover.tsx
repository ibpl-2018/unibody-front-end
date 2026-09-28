'use client';
import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { formatINR } from '@unibody/shared';
import { ButtonLink, ProductImage } from '@/components/ui';
import { useCart } from '@/lib/store/cart';

/** Mini "Added to bag" card that drops from the bag icon for a few seconds after an add. */
export function AddedPopover() {
  const { lastAdded, dismissAdded, count } = useCart();
  useEffect(() => {
    if (!lastAdded) return;
    const t = setTimeout(dismissAdded, 4500);
    return () => clearTimeout(t);
  }, [lastAdded, dismissAdded]);
  if (!lastAdded) return null;
  const { line } = lastAdded;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[64px] z-50 rounded-2xl border border-line-subtle bg-surface p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[340px]"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <CheckCircle2 className="size-4" /> Added to bag
        </p>
        <button onClick={dismissAdded} aria-label="Dismiss" className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-2">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProductImage src={line.image} alt="" tint={line.icon} className="size-14 shrink-0" rounded="rounded-xl" imgClassName="p-1.5" />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{line.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            Qty {line.qty} · {formatINR(line.price)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ButtonLink href="/bag" variant="secondary" size="sm" onClick={dismissAdded}>
          View bag ({count})
        </ButtonLink>
        <ButtonLink href="/checkout" size="sm" onClick={dismissAdded}>
          Checkout
        </ButtonLink>
      </div>
    </div>
  );
}
