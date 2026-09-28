'use client';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { formatINR, type AdminProductListItem } from '@unibody/shared';
import { adminApi, useDebounced } from '@/lib/admin/api';
import { cn } from '@/lib/cn';
import { Thumb } from './ui';

export interface PickedProduct {
  id: string;
  title: string;
  sku: string;
  icon?: string;
  image?: string | null;
  cost?: number;
}

/** Search-as-you-type product picker (title, SKU, part no., A-number). */
export function ProductPicker({ value, onChange, placeholder = 'Search product by name, SKU or A-number', invalid, autoFocus }: { value: PickedProduct | null; onChange: (p: PickedProduct | null) => void; placeholder?: string; invalid?: boolean; autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dq = useDebounced(q.trim(), 200);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    adminApi.admin
      .products({ q: dq || undefined, pageSize: 8 })
      .then((r) => live && setItems(r.items))
      .catch(() => live && setItems([]))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [dq, open]);
  useEffect(() => {
    const on = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, []);

  if (value)
    return (
      <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-surface-2/60 pl-1.5 pr-2">
        <Thumb src={value.image} icon={value.icon} alt="" size="sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{value.title}</p>
          <p className="truncate font-mono text-[11px] text-muted">{value.sku}</p>
        </div>
        <button type="button" aria-label="Change product" onClick={() => onChange(null)} className="rounded-full p-1 text-muted hover:bg-surface hover:text-fg">
          <X className="size-4" />
        </button>
      </div>
    );

  return (
    <div ref={ref} className="relative">
      <label className={cn('flex h-11 items-center gap-2 rounded-xl border bg-surface px-3 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15', invalid ? 'border-danger' : 'border-line')}>
        <Search className="size-4 text-subtle" />
        <input value={q} autoFocus={autoFocus} onFocus={() => setOpen(true)} onChange={(e) => (setQ(e.target.value), setOpen(true))} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle" />
      </label>
      {open && (
        <ul className="absolute inset-x-0 top-12 z-50 max-h-72 overflow-y-auto rounded-xl border border-line-subtle bg-surface p-1 shadow-2xl">
          {items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ id: p.id, title: p.title, sku: p.sku, icon: p.icon, image: p.image, cost: p.cost });
                  setOpen(false);
                  setQ('');
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
              >
                <Thumb src={p.image} icon={p.icon} alt="" size="sm" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-medium">{p.title}</span>
                  <span className="block truncate text-[11px] text-muted">
                    <span className="font-mono">{p.sku}</span> · {p.stock} available
                  </span>
                </span>
                <span className="text-xs tabular-nums text-muted">{formatINR(p.price)}</span>
              </button>
            </li>
          ))}
          {!loading && items.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">No products found</li>}
          {loading && items.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">Searching…</li>}
        </ul>
      )}
    </div>
  );
}
