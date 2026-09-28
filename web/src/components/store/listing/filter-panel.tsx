'use client';
import { useEffect, useState } from 'react';
import { CONDITION_LABEL, COLOUR_HEX, CONDITIONS, CONDITION_TONE, formatINR, type Condition, type ProductFacetsDTO } from '@unibody/shared';
import { Switch } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ListingFilters } from '@/lib/store/filters';

const TONE_DOT: Record<string, string> = { success: 'bg-success', info: 'bg-accent', purple: 'bg-purple', warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-subtle' };
const LAYOUTS = [
  { value: 'US', label: 'US English' },
  { value: 'UK', label: 'UK English' },
  { value: 'IN', label: 'Indian (Hindi)' },
];

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line-subtle py-4 first:pt-0 last:border-0">
      <legend className="mb-2.5 text-[13px] font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function CheckRow({ checked, onChange, label, count, dot }: { checked: boolean; onChange: () => void; label: string; count?: number; dot?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px]">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 rounded accent-[var(--accent)]" />
      {dot && <span className={cn('size-2 rounded-full', dot)} aria-hidden />}
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-subtle">{count}</span>}
    </label>
  );
}

/** Dual-thumb price range (rupees). Commits on release. */
function PriceRange({ min, max, value, onCommit }: { min: number; max: number; value: [number, number]; onCommit: (v: [number, number]) => void }) {
  const [v, setV] = useState<[number, number]>(value);
  useEffect(() => setV(value), [value]);
  const step = max - min > 20000 ? 500 : 100;
  const pct = (x: number) => ((x - min) / Math.max(1, max - min)) * 100;
  const commit = () => onCommit(v);
  return (
    <div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-subtle" />
        <div className="gradient-brand absolute top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ left: `${pct(v[0])}%`, right: `${100 - pct(v[1])}%` }} />
        <input
          type="range"
          aria-label="Minimum price"
          min={min}
          max={max}
          step={step}
          value={v[0]}
          onChange={(e) => setV([Math.min(Number(e.target.value), v[1] - step), v[1]])}
          onPointerUp={commit}
          onKeyUp={commit}
          className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={min}
          max={max}
          step={step}
          value={v[1]}
          onChange={(e) => setV([v[0], Math.max(Number(e.target.value), v[0] + step)])}
          onPointerUp={commit}
          onKeyUp={commit}
          className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{formatINR(v[0] * 100)}</span>
        <span>{formatINR(v[1] * 100)}</span>
      </div>
      <style>{`.range-thumb::-webkit-slider-thumb{pointer-events:auto;appearance:none;width:18px;height:18px;border-radius:9999px;background:var(--surface);border:1px solid var(--line);box-shadow:0 1px 4px rgb(0 0 0/.2);cursor:pointer}.range-thumb::-moz-range-thumb{pointer-events:auto;width:18px;height:18px;border-radius:9999px;background:var(--surface);border:1px solid var(--line);box-shadow:0 1px 4px rgb(0 0 0/.2);cursor:pointer}`}</style>
    </div>
  );
}

export function FilterPanel({ facets, filters, onChange, showLayout }: { facets: ProductFacetsDTO; filters: ListingFilters; onChange: (f: Partial<ListingFilters>) => void; showLayout: boolean }) {
  const condCount = new Map(facets.conditions.map((c) => [c.value, c.count]));
  const conds = CONDITIONS.filter((c) => condCount.has(c) || filters.cond.includes(c));
  const pMin = Math.floor(facets.priceMin / 100 / 100) * 100;
  const pMax = Math.ceil(facets.priceMax / 100 / 100) * 100;
  return (
    <div>
      {conds.length > 0 && (
        <Group title="Condition">
          {conds.map((c: Condition) => (
            <CheckRow
              key={c}
              checked={filters.cond.includes(c)}
              onChange={() => onChange({ cond: toggle(filters.cond, c) })}
              label={CONDITION_LABEL[c]}
              count={condCount.get(c) ?? 0}
              dot={TONE_DOT[CONDITION_TONE[c]]}
            />
          ))}
        </Group>
      )}
      {facets.colours.length > 0 && (
        <Group title="Colour">
          <div className="flex flex-wrap gap-2">
            {facets.colours.map((c) => {
              const on = filters.colour.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChange({ colour: toggle(filters.colour, c.value) })}
                  aria-pressed={on}
                  title={`${c.value} (${c.count})`}
                  aria-label={`${c.value}, ${c.count} parts`}
                  className={cn('size-7 rounded-full border border-line p-0.5 transition', on ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : 'hover:scale-105')}
                >
                  <span className="block size-full rounded-full" style={{ background: COLOUR_HEX[c.value] ?? 'var(--line)' }} />
                </button>
              );
            })}
          </div>
        </Group>
      )}
      {pMax > pMin && (
        <Group title="Price">
          <PriceRange min={pMin} max={pMax} value={[filters.min ?? pMin, filters.max ?? pMax]} onCommit={([a, b]) => onChange({ min: a > pMin ? a : null, max: b < pMax ? b : null })} />
        </Group>
      )}
      {showLayout && (
        <Group title="Keyboard layout">
          {LAYOUTS.map((l) => (
            <CheckRow key={l.value} checked={filters.layout.includes(l.value)} onChange={() => onChange({ layout: toggle(filters.layout, l.value) })} label={l.label} />
          ))}
        </Group>
      )}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between text-[13px]">
          <span id="f-stock">In stock only</span>
          <Switch checked={filters.stock} onChange={(v) => onChange({ stock: v })} label="In stock only" />
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span id="f-cod">Cash on Delivery</span>
          <Switch checked={filters.cod} onChange={(v) => onChange({ cod: v })} label="Cash on Delivery available" />
        </div>
      </div>
    </div>
  );
}
