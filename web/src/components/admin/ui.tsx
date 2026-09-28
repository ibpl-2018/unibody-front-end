'use client';
/**
 * Admin building blocks (page header, cards, KPI tiles, data table, filters, pagination,
 * confirm dialog, dropdown menus…). Token-driven so light/dark both work.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BatteryFull, Box, Cable, Camera, Cpu, Fan, HardDrive, Keyboard, Laptop, Monitor, MousePointer2, Plug, Speaker, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Button, Modal, ProductImage, Skeleton, EmptyState, tintFor } from '@/components/ui';
import { cn } from '@/lib/cn';

// ------------------------------------------------------------------ layout
export function PageHeader({ title, subtitle, actions, back, className }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string }; className?: string }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-fg">
            <ChevronLeft className="size-4" />
            {back.label}
          </Link>
        )}
        <h1 className="truncate text-[26px] font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClassName, padded = true }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; padded?: boolean }) {
  return (
    <section className={cn('min-w-0 rounded-[var(--radius-card)] border border-line-subtle bg-surface', className)}>
      {(title || action) && (
        <header className={cn('flex items-center justify-between gap-3', padded ? 'px-5 pt-5 sm:px-6' : 'border-b border-line-subtle px-5 py-4 sm:px-6')}>
          {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn(padded && 'p-5 sm:p-6', padded && (title || action) && 'pt-4 sm:pt-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export const ViewAll = ({ href, children = 'View all' }: { href: string; children?: React.ReactNode }) => (
  <Link href={href} className="inline-flex items-center gap-0.5 text-[13px] font-medium text-link hover:underline">
    {children}
    <ChevronRight className="size-3.5" />
  </Link>
);

// ------------------------------------------------------------------ KPI
const CHIP: Record<string, string> = {
  blue: 'bg-vivid-blue',
  green: 'bg-vivid-green',
  purple: 'bg-vivid-purple',
  orange: 'bg-vivid-orange',
  pink: 'bg-vivid-pink',
  teal: 'bg-vivid-teal',
  indigo: 'bg-vivid-indigo',
};
export type ChipColor = keyof typeof CHIP;
export function IconChip({ color, children, className }: { color: ChipColor; children: React.ReactNode; className?: string }) {
  return <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white shadow-sm [&_svg]:size-[17px]', CHIP[color], className)}>{children}</span>;
}

export function Delta({ value, suffix = '%', label, invert, pts }: { value: number | null; suffix?: string; label?: string; invert?: boolean; pts?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-xs text-subtle">{label ?? '—'}</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? 'text-success' : 'text-danger')}>
        {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
        {Math.abs(value).toFixed(1)}
        {pts ? ' pts' : suffix}
      </span>
      {label && <span className="text-subtle">{label}</span>}
    </span>
  );
}
export const changePct = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : cur ? 100 : 0);

export function KpiCard({ label, value, icon, color, delta, loading, hint, href }: { label: string; value: React.ReactNode; icon: React.ReactNode; color: ChipColor; delta?: React.ReactNode; loading?: boolean; hint?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <IconChip color={color}>{icon}</IconChip>
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-32" /> : <div className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums sm:text-[28px]">{value}</div>}
      <div className="mt-1.5 min-h-4">{loading ? <Skeleton className="h-3.5 w-40" /> : delta ?? (hint && <span className="text-xs text-subtle">{hint}</span>)}</div>
    </>
  );
  const cls = 'block rounded-[var(--radius-card)] border border-line-subtle bg-surface p-5 transition';
  return href ? (
    <Link href={href} className={cn(cls, 'hover:border-line hover:shadow-card')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// ------------------------------------------------------------------ states
export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-line-subtle bg-surface px-6 py-12 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="size-5" />
      </div>
      <div>
        <p className="font-semibold">Couldn’t load this</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  display: Monitor,
  keyboard: Keyboard,
  battery: BatteryFull,
  cpu: Cpu,
  charger: Plug,
  trackpad: MousePointer2,
  fan: Fan,
  ssd: HardDrive,
  speaker: Speaker,
  camera: Camera,
  laptop: Laptop,
  cable: Cable,
};
export function Thumb({ src, icon, alt, size = 'md' }: { src?: string | null; icon?: string | null; alt: string; size?: 'sm' | 'md' | 'lg' }) {
  const box = cn('shrink-0', size === 'sm' ? 'size-8' : size === 'lg' ? 'size-14' : 'size-10');
  if (!src) {
    const I = (icon && ICONS[icon]) || Box;
    return (
      <span className={cn(box, 'flex items-center justify-center rounded-lg text-muted', tintFor(icon))}>
        <I className={size === 'lg' ? 'size-6' : 'size-4'} />
      </span>
    );
  }
  return <ProductImage src={src} alt={alt} tint={icon} rounded="rounded-lg" className={box} imgClassName="p-1 drop-shadow-[0_3px_5px_rgba(0,0,0,0.18)]" />;
}

// ------------------------------------------------------------------ data table
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  /** hide below this breakpoint */
  hide?: 'sm' | 'md' | 'lg' | 'xl';
}
const hideCls = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  selected,
  onToggle,
  onToggleAll,
  rowHref,
  onRowClick,
  className,
  skeletonRows = 8,
  dense,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (r: T) => string;
  loading?: boolean;
  empty?: React.ReactNode;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (ids: string[], on: boolean) => void;
  rowHref?: (r: T) => string;
  onRowClick?: (r: T) => void;
  className?: string;
  skeletonRows?: number;
  dense?: boolean;
}) {
  const router = useRouter();
  const selectable = !!selected && !!onToggle;
  const ids = rows?.map(rowKey) ?? [];
  const allOn = selectable && ids.length > 0 && ids.every((id) => selected!.has(id));
  const align = (a?: Column<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const pad = dense ? 'py-2.5' : 'py-3';
  return (
    <div className={cn('overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface', className)}>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-subtle bg-surface-2/70">
              {selectable && (
                <th className="w-11 py-2.5 pl-4">
                  <input type="checkbox" aria-label="Select all" className="size-4 accent-[var(--accent)]" checked={allOn} onChange={(e) => onToggleAll?.(ids, e.target.checked)} />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={cn('whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted first:pl-4 last:pr-4 sm:first:pl-5', align(c.align), c.hide && hideCls[c.hide], c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {rows === undefined && loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i}>
                    {selectable && <td className="py-3.5 pl-4" />}
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-3 py-3.5 first:pl-4 sm:first:pl-5', c.hide && hideCls[c.hide])}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((r) => {
                  const id = rowKey(r);
                  const href = rowHref?.(r);
                  const clickable = !!href || !!onRowClick;
                  return (
                    <tr
                      key={id}
                      className={cn('group transition-colors', clickable && 'cursor-pointer hover:bg-surface-2/60', selected?.has(id) && 'bg-accent-soft/50')}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('a,button,input,select,label,[data-stop]')) return;
                        if (onRowClick) onRowClick(r);
                        else if (href) {
                          if (e.metaKey || e.ctrlKey) window.open(href, '_blank');
                          else router.push(href);
                        }
                      }}
                    >
                      {selectable && (
                        <td className="w-11 pl-4" data-stop>
                          <input type="checkbox" aria-label="Select row" className="size-4 accent-[var(--accent)]" checked={selected!.has(id)} onChange={() => onToggle!(id)} />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td key={c.key} className={cn('px-3 align-middle first:pl-4 last:pr-4 sm:first:pl-5', pad, align(c.align), c.hide && hideCls[c.hide], c.className)}>
                          {c.cell(r)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {rows && rows.length === 0 && (empty ?? <EmptyState title="Nothing here yet" />)}
    </div>
  );
}


export function Pagination({ page, pageSize, total, onPage, className }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; className?: string }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const last = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className={cn('mt-4 flex items-center justify-between gap-3', className)}>
      <p className="text-[13px] text-muted tabular-nums">
        Showing {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= last} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ filters
export function SearchInput({ value, onChange, placeholder, className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <label className={cn('relative flex h-10 items-center', className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-subtle" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-xl border border-line bg-surface pl-9 pr-8 text-sm text-fg outline-none transition placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Clear search" className="absolute right-2 rounded-full p-1 text-subtle hover:text-fg" onClick={() => onChange('')}>
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

/** Compact "Label: Value ▾" filter backed by a native <select> (accessible + mobile friendly). */
export function FilterSelect<V extends string>({ label, value, onChange, options, className }: { label: string; value: V; onChange: (v: V) => void; options: { value: V; label: string }[]; className?: string }) {
  const current = options.find((o) => o.value === value)?.label ?? 'All';
  return (
    <label className={cn('relative inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border border-line bg-surface pl-3.5 pr-9 text-sm transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 hover:bg-surface-2/60', className)}>
      <span className="truncate whitespace-nowrap">
        <span className="text-muted">{label}:</span> <span className="font-medium text-fg">{current}</span>
      </span>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-subtle" />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as V)} className="absolute inset-0 cursor-pointer opacity-0">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Grey pill tabs with counts (orders status tabs). Scrolls horizontally on small screens. */
export function PillTabs<V extends string>({ value, onChange, tabs, className }: { value: V; onChange: (v: V) => void; tabs: { value: V; label: string; count?: number }[]; className?: string }) {
  return (
    <div className={cn('no-scrollbar -mx-4 min-w-0 max-w-[100vw] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0', className)}>
      <div className="inline-flex gap-0.5 rounded-xl bg-surface-2 p-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={value === t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn('whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition', value === t.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}
          >
            {t.label}
            {t.count !== undefined && <span className={cn('tabular-nums', value === t.value ? 'text-fg' : 'text-subtle')}> · {t.count.toLocaleString('en-IN')}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Underline tabs used for sub-sections (Inventory / Units / Movements). */
export function LineTabs<V extends string>({ value, onChange, tabs, className }: { value: V; onChange: (v: V) => void; tabs: { value: V; label: React.ReactNode; href?: string }[]; className?: string }) {
  return (
    <div className={cn('no-scrollbar mb-5 flex min-w-0 max-w-full gap-5 overflow-x-auto border-b border-line-subtle', className)} role="tablist">
      {tabs.map((t) => {
        const cls = cn('-mb-px whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition', value === t.value ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg');
        return t.href ? (
          <Link key={t.value} href={t.href} className={cls} role="tab" aria-selected={value === t.value}>
            {t.label}
          </Link>
        ) : (
          <button key={t.value} type="button" role="tab" aria-selected={value === t.value} className={cls} onClick={() => onChange(t.value)}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Black floating bulk-action bar (A02). */
export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <div className="sticky top-[68px] z-20 mb-4 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl bg-[#111113] px-4 py-3 text-sm text-white shadow-xl ring-1 ring-white/10 sm:px-5">
      <span className="mr-auto font-semibold tabular-nums">{count} selected</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
      <button type="button" aria-label="Clear selection" onClick={onClear} className="ml-1 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}
export const BulkAction = ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white/90 transition hover:bg-white/12 hover:text-white disabled:opacity-40" {...rest}>
    {children}
  </button>
);

// ------------------------------------------------------------------ dropdown menu
export function Dropdown({ trigger, children, align = 'right', className, label = 'More actions' }: { trigger?: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: 'left' | 'right'; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', on);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', on);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={ref} className={cn('relative inline-block', className)} data-stop>
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cn(!trigger && 'inline-flex size-8 items-center justify-center rounded-full text-subtle transition hover:bg-surface-2 hover:text-fg')}>
        {trigger ?? <MoreHorizontal className="size-4" />}
      </button>
      {open && (
        <div className={cn('absolute z-40 mt-1.5 min-w-[190px] overflow-hidden rounded-xl border border-line-subtle bg-surface p-1 shadow-xl', align === 'right' ? 'right-0' : 'left-0')} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
export function MenuItem({ children, onClick, href, danger, icon, target }: { children: React.ReactNode; onClick?: () => void; href?: string; danger?: boolean; icon?: React.ReactNode; target?: string }) {
  const cls = cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition hover:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted', danger ? 'text-danger [&_svg]:text-danger' : 'text-fg');
  return href ? (
    <Link href={href} className={cls} role="menuitem" target={target} onClick={onClick}>
      {icon}
      {children}
    </Link>
  ) : (
    <button type="button" className={cls} role="menuitem" onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ confirm dialog
interface ConfirmOpts {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {state?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {state?.body && <div className="text-sm text-muted">{state.body}</div>}
      </Modal>
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);

// ------------------------------------------------------------------ small bits
export function MoneyInput({ value, onChange, invalid, placeholder, className, id, disabled }: { value: string; onChange: (v: string) => void; invalid?: boolean; placeholder?: string; className?: string; id?: string; disabled?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-muted">₹</span>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        className={cn(
          'h-11 w-full rounded-xl border border-line bg-surface pl-8 pr-3.5 text-[15px] tabular-nums text-fg outline-none transition placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60',
          invalid && 'border-danger',
        )}
      />
    </div>
  );
}

export function KeyVal({ k, children, className }: { k: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-1.5 text-sm', className)}>
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium text-fg">{children}</span>
    </div>
  );
}

export function StatMini({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'success' | 'danger' | 'warning' | 'accent' }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line-subtle bg-surface px-5 py-4">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={cn('mt-1 text-[22px] font-semibold tracking-tight tabular-nums', tone === 'success' && 'text-success', tone === 'danger' && 'text-danger', tone === 'warning' && 'text-warning', tone === 'accent' && 'text-accent')}>{value}</p>
    </div>
  );
}

export function CardLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Two-column form grid. */
export const FormGrid = ({ children, className, cols = 2 }: { children: React.ReactNode; className?: string; cols?: 2 | 3 | 4 }) => (
  <div className={cn('grid gap-4', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-3', cols === 4 && 'grid-cols-2 lg:grid-cols-4', className)}>{children}</div>
);
