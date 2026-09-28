'use client';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { CONDITION_LABEL, CONDITION_TONE, formatINR, type ProductCardDTO } from '@unibody/shared';
import { Badge, ProductImage } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCart, lineFromProduct } from '@/lib/store/cart';
import { useMyDevice } from '@/lib/store/device';

export function ProductCard({ product: p, priority, className }: { product: ProductCardDTO; priority?: boolean; className?: string }) {
  const { add } = useCart();
  const { device, fits } = useMyDevice();
  const out = p.stock <= 0;
  const fitsMine = fits(p.modelIds);
  const fitsText = p.fitsLabel.split(' · ')[0];
  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-[var(--radius-tile)] bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-xl', className)}>
      <Link href={`/p/${p.slug}`} className="flex flex-1 flex-col after:absolute after:inset-0 after:content-['']" aria-label={p.title}>
        <ProductImage src={p.image} alt="" tint={p.icon} rounded="rounded-none" className="aspect-[4/3] w-full" imgClassName={cn('p-[10%] transition duration-500 group-hover:scale-[1.04]', out && 'opacity-50 grayscale')} />
        <div className="flex flex-1 flex-col gap-1.5 p-4 pb-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={CONDITION_TONE[p.condition]} className="text-[11px]">
              {CONDITION_LABEL[p.condition]}
            </Badge>
            {out ? (
              <Badge tone="neutral" className="text-[11px]">
                Sold out
              </Badge>
            ) : p.stock <= 2 ? (
              <Badge tone="warning" className="text-[11px]">
                {p.stock} left
              </Badge>
            ) : null}
          </div>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">{p.title}</h3>
          <p className="truncate text-xs text-muted">{fitsText}</p>
          {device && fitsMine && (
            <p className="flex items-center gap-1 text-xs font-medium text-success">
              <Check className="size-3.5" /> Fits your {device.short}
            </p>
          )}
          <div className="mt-auto flex items-end justify-between gap-2 pr-9 pt-2">
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[17px] font-semibold tracking-tight">{formatINR(p.price)}</span>
              {p.mrp && p.mrp > p.price ? <span className="text-xs text-subtle line-through">{formatINR(p.mrp)}</span> : null}
            </span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        disabled={out}
        onClick={() => add(lineFromProduct(p))}
        aria-label={out ? `${p.title} is sold out` : `Add ${p.title} to bag`}
        className="absolute bottom-3.5 right-3.5 z-10 inline-flex size-8 items-center justify-center rounded-full bg-accent text-on-accent shadow-md transition hover:scale-105 hover:bg-accent-hover active:scale-95 disabled:bg-line disabled:text-subtle disabled:shadow-none"
      >
        <Plus className="size-[18px]" strokeWidth={2.5} />
      </button>
    </article>
  );
}

export function ProductGrid({ products, className }: { products: ProductCardDTO[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4', className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-tile)] bg-surface shadow-card">
      <div className="aspect-[4/3] animate-pulse bg-surface-2" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-20 animate-pulse rounded-full bg-surface-2" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
        <div className="h-5 w-16 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}
