'use client';
/** Hand-built, dependency-free charts for the admin (bars, donut, horizontal bars). */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

export interface BarDatum {
  key: string;
  label: string; // x label (e.g. "5 Sep")
  value: number;
  tooltip: React.ReactNode;
}

/**
 * Vertical bar chart with blue gradient bars. The most recent `highlightLast` bars are rendered
 * in the strong gradient (like the Figma), earlier ones in a soft tint. Hover shows a tooltip.
 */
export function BarChart({ data, height = 220, highlightLast = 7, format, className }: { data: BarDatum[]; height?: number; highlightLast?: number; format?: (v: number) => string; className?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);
  const n = data.length;
  const ticks = useMemo(() => {
    if (n <= 1) return data.map((_, i) => i);
    const want = n <= 7 ? n : 5;
    return Array.from({ length: want }, (_, i) => Math.round((i * (n - 1)) / (want - 1)));
  }, [n, data]);
  return (
    <div className={cn('relative select-none', className)} onMouseLeave={() => setHover(null)}>
      {/* grid lines */}
      <div className="relative" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line-subtle" style={{ bottom: `${t * 100}%` }}>
            {format && <span className="absolute -top-2 right-0 text-[10px] leading-none tabular-nums text-subtle">{format(max * t)}</span>}
          </div>
        ))}
        <div className="absolute inset-y-0 left-0 right-10 flex items-end" style={{ gap: n > 45 ? 1 : n > 20 ? 4 : 10 }}>
          {data.map((d, i) => {
            const strong = i >= n - highlightLast;
            return (
              <div key={d.key} className="flex h-full min-w-0 flex-1 items-end justify-center">
                <div
                  className={cn(
                    'w-full max-w-14 rounded-t-[4px] transition-opacity',
                    d.value === 0 ? 'bg-line-subtle' : strong ? 'bg-[linear-gradient(180deg,#5e5ce6,#0a84ff)]' : 'bg-[linear-gradient(180deg,#8fc3ff,#c4e0ff)] dark:bg-[linear-gradient(180deg,#2c5f96,#1d3f66)]',
                    hover !== null && hover !== i && 'opacity-50',
                  )}
                  style={{ height: d.value > 0 ? `max(3px, ${(d.value / max) * 100}%)` : '2px' }}
                />
              </div>
            );
          })}
        </div>
        {/* hit targets (wider than marks) */}
        <div className="absolute inset-y-0 left-0 right-10 flex">
          {data.map((d, i) => (
            <div key={d.key} className="h-full flex-1" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
          ))}
        </div>
        {hover !== null && data[hover] && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-10">
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line-subtle bg-surface px-3 py-2 text-xs shadow-xl"
            style={{ left: `${((hover + 0.5) / n) * 100}%`, bottom: `${Math.min(100, (data[hover].value / max) * 100)}%`, marginBottom: 8 }}
          >
            {data[hover].tooltip}
          </div>
          </div>
        )}
      </div>
      <div className="relative mr-10 mt-2 h-4 text-[11px] text-subtle">
        {ticks.map((i) => (
          <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap tabular-nums first:translate-x-0 last:-translate-x-full" style={{ left: `${((i + (i === 0 ? 0 : i === n - 1 ? 1 : 0.5)) / n) * 100}%` }}>
            {data[i]?.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface DonutSlice {
  key: string;
  value: number;
  color: string;
}
/** SVG donut with 2px surface gaps between segments. */
export function Donut({ slices, size = 150, thickness = 22, center }: { slices: DonutSlice[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gapLen = total && slices.filter((s) => s.value > 0).length > 1 ? 3 : 0;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Donut chart">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, len - gapLen)} ${c}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return el;
          })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

/** Horizontal gradient bars (Orders by city). */
export function HBarList({ items, className }: { items: { key: string; label: string; value: number; valueLabel: React.ReactNode; title?: string }[]; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn('space-y-3.5', className)}>
      {items.map((it) => (
        <li key={it.key} title={it.title}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{it.label}</span>
            <span className="shrink-0 text-[13px] tabular-nums text-muted">{it.valueLabel}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#0a84ff,#5856d6_60%,#af52de)] transition-[width] duration-500" style={{ width: `${Math.max(3, (it.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
