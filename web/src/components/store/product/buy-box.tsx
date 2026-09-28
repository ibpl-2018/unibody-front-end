'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BadgeCheck, Info, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Tag } from 'lucide-react';
import { CONDITION_DESCRIPTION, CONDITION_LABEL, CONDITION_SHORT, CONDITION_TONE, COLOUR_HEX, CONDITIONS, formatINR, percentOff, type ProductCardDTO, type ProductDetailDTO } from '@unibody/shared';
import { Badge, Button, ProductImage } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCart, lineFromProduct } from '@/lib/store/cart';
import { useStoreConfig } from '@/lib/store/config';
import { FitCard, PincodeCheck } from './checks';

type Opt = ProductCardDTO;

function stockText(n: number) {
  if (n <= 0) return 'Sold out';
  if (n === 1) return 'Only 1 left';
  return `${n} in stock`;
}

/** Colour options: one per colour, preferring the current condition. */
function finishOptions(p: ProductDetailDTO): Opt[] {
  const all = [p as Opt, ...p.variants];
  const colours = [...new Set(all.map((x) => x.colour).filter((c): c is string => !!c))];
  if (colours.length < 2) return [];
  return colours.map((c) => {
    const same = all.filter((x) => x.colour === c);
    return same.find((x) => x.id === p.id) ?? same.find((x) => x.condition === p.condition) ?? same.sort((a, b) => a.price - b.price)[0];
  });
}

/** Condition options for the current colour (cheapest per condition). */
function conditionOptions(p: ProductDetailDTO): Opt[] {
  const all = [p as Opt, ...p.variants].filter((x) => x.colour === p.colour || !x.colour || !p.colour);
  const out: Opt[] = [];
  for (const c of CONDITIONS) {
    const same = all.filter((x) => x.condition === c);
    if (!same.length) continue;
    out.push(same.find((x) => x.id === p.id) ?? same.sort((a, b) => b.stock - a.stock || a.price - b.price)[0]);
  }
  return out.length > 1 ? out : [];
}

export function BuyBox({ product: p }: { product: ProductDetailDTO }) {
  const router = useRouter();
  const { add, cart } = useCart();
  const config = useStoreConfig();
  const [qty, setQty] = useState(1);
  const out = p.stock <= 0;
  const max = Math.max(1, Math.min(p.stock, 10));
  const off = percentOff(p.price, p.mrp);
  const finishes = finishOptions(p);
  const conds = conditionOptions(p);
  const inBag = cart.lines.find((l) => l.productId === p.id);

  const addToBag = () => add(lineFromProduct(p), qty);
  const buyNow = () => {
    if (!inBag) add(lineFromProduct(p), qty);
    router.push('/checkout');
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={CONDITION_TONE[p.condition]}>{CONDITION_LABEL[p.condition]}</Badge>
          <Badge tone={out ? 'danger' : p.stock <= 2 ? 'warning' : 'neutral'}>{stockText(p.stock)}</Badge>
        </div>
        <h1 className="mt-3 text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[34px]">{p.title}</h1>
        <p className="mt-2 text-xs text-muted">{[p.colour, p.partNumber && `Part no. ${p.partNumber}`, p.keyboardLayout && `${p.keyboardLayout} layout`, `SKU ${p.sku}`].filter(Boolean).join(' · ')}</p>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[34px] font-bold tracking-tight">{formatINR(p.price)}</span>
          {p.mrp && p.mrp > p.price && <span className="text-sm text-subtle line-through">MRP {formatINR(p.mrp)}</span>}
          {off > 0 && <Badge tone="danger">{off}% off</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted">Inclusive of GST · {p.price >= config.freeShippingOver ? 'Free delivery' : `Free delivery over ${formatINR(config.freeShippingOver)}`}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {config.banner && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger">
              <Tag className="size-3.5" /> {config.banner.code} — {config.banner.title.replace(/\.$/, '')}
            </span>
          )}
          {config.onlinePaymentsEnabled && config.prepaidDiscountPct > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-soft px-3 py-1 text-xs font-medium text-purple">Extra {config.prepaidDiscountPct}% off on prepaid</span>
          )}
        </div>
      </div>

      {finishes.length > 0 && (
        <fieldset>
          <legend className="text-[13px] font-semibold">
            Finish — <span className="font-normal text-muted">{p.colour}</span>
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {finishes.map((v) => {
              const on = v.id === p.id;
              return (
                <Link
                  key={v.id}
                  href={`/p/${v.slug}`}
                  replace
                  scroll={false}
                  aria-current={on ? 'true' : undefined}
                  className={cn('flex flex-col items-center gap-1 rounded-2xl border p-2 pb-2.5 text-xs transition', on ? 'border-accent ring-2 ring-accent/25' : 'border-line-subtle hover:border-line')}
                >
                  <ProductImage src={v.image} alt="" tint={v.icon} className="aspect-[4/3] w-full" rounded="rounded-xl" imgClassName="p-1" />
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border border-line" style={{ background: COLOUR_HEX[v.colour ?? ''] ?? 'var(--line)' }} aria-hidden />
                    {v.colour}
                  </span>
                </Link>
              );
            })}
          </div>
        </fieldset>
      )}

      {conds.length > 0 && (
        <fieldset>
          <legend className="text-[13px] font-semibold">Condition</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {conds.map((v) => {
              const on = v.id === p.id;
              return (
                <Link
                  key={v.id}
                  href={`/p/${v.slug}`}
                  replace
                  scroll={false}
                  aria-current={on ? 'true' : undefined}
                  className={cn('rounded-2xl border p-3 transition', on ? 'border-accent bg-accent-soft/50 ring-2 ring-accent/25' : 'border-line-subtle hover:border-line')}
                >
                  <Badge tone={CONDITION_TONE[v.condition]} className="text-[11px]">
                    {CONDITION_SHORT[v.condition]}
                  </Badge>
                  <p className="mt-1.5 text-[17px] font-semibold tracking-tight">{formatINR(v.price)}</p>
                  <p className="text-[11px] text-muted">{stockText(v.stock)}</p>
                </Link>
              );
            })}
          </div>
        </fieldset>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-bg-2 px-3 py-2.5 text-xs text-muted">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          <strong className="font-medium text-fg">{CONDITION_LABEL[p.condition]}:</strong> {CONDITION_DESCRIPTION[p.condition]}{' '}
          <Link href="/help/grades" className="text-link hover:underline">
            How we grade
          </Link>
        </span>
      </p>

      <FitCard productId={p.id} compatible={p.compatible} />
      <PincodeCheck />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 items-center rounded-full border border-line" role="group" aria-label="Quantity">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || out} aria-label="Decrease quantity" className="flex size-11 items-center justify-center rounded-full disabled:opacity-40">
            <Minus className="size-4" />
          </button>
          <span className="w-6 text-center text-[15px] font-medium tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max || out} aria-label="Increase quantity" className="flex size-11 items-center justify-center rounded-full disabled:opacity-40">
            <Plus className="size-4" />
          </button>
        </div>
        <Button size="lg" className="min-w-0 flex-1" onClick={addToBag} disabled={out}>
          <ShoppingBag className="size-[18px]" /> {out ? 'Sold out' : 'Add to Bag'}
        </Button>
        <Button size="lg" variant="dark" className="w-full sm:w-auto" onClick={buyNow} disabled={out}>
          Buy Now
        </Button>
      </div>
      {inBag && <p className="-mt-2 text-xs text-muted">{inBag.qty} already in your bag</p>}

      <ul className="grid grid-cols-3 gap-2">
        {[
          { icon: ShieldCheck, tone: 'bg-vivid-green', label: p.warrantyDays ? `${p.warrantyDays}-day warranty` : 'Warranty' },
          { icon: RotateCcw, tone: 'bg-vivid-blue', label: '7-day returns' },
          { icon: BadgeCheck, tone: 'bg-vivid-purple', label: 'Bench-tested' },
        ].map((c) => (
          <li key={c.label} className="flex items-center gap-2 rounded-2xl bg-bg-2 p-2.5 text-xs font-medium">
            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg text-white', c.tone)}>
              <c.icon className="size-4" />
            </span>
            {c.label}
          </li>
        ))}
      </ul>

      {/* Mobile sticky buy bar */}
      {!out && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-subtle glass px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold">{formatINR(p.price)}</p>
              <p className="truncate text-[11px] text-muted">{CONDITION_LABEL[p.condition]}</p>
            </div>
            <Button onClick={addToBag}>Add to Bag</Button>
          </div>
        </div>
      )}
    </div>
  );
}
