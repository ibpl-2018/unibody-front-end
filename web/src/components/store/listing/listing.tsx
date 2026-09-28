'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MessageCircle, PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import { CONDITION_SHORT, type CategoryDTO, type ProductCardDTO, type ProductListDTO } from '@unibody/shared';
import { Button, EmptyState, Select, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { activeFilterCount, filtersToQuery, filtersToSearch, PAGE_SIZE, SORTS, type ListingFilters, type SortKey } from '@/lib/store/filters';
import { categoryRender, categoryShort, waLink } from '@/lib/store/catalog';
import { useStoreConfig } from '@/lib/store/config';
import { ProductCard } from '../product-card';
import { FilterPanel } from './filter-panel';

const KEYBOARD_CATS = new Set(['top-case', 'keyboard']);

export interface ListingProps {
  initial: ProductListDTO;
  filters: ListingFilters;
  scope: { family?: string; model?: string };
  basePath: string;
  categories: CategoryDTO[];
}

export function Listing({ initial, filters, scope, basePath, categories }: ListingProps) {
  const router = useRouter();
  const toast = useToast();
  const config = useStoreConfig();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<ProductCardDTO[]>(initial.items);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheet, setSheet] = useState(false);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const facetCats = initial.facets.categories.map((fc) => ({ ...fc, cat: catById.get(fc.id) })).filter((x) => x.cat);
  const allCount = initial.facets.categories.reduce((a, c) => a + c.count, 0);
  const activeCat = filters.cat ? catBySlug.get(filters.cat) : undefined;
  const showLayout = (!!filters.cat && KEYBOARD_CATS.has(filters.cat)) || filters.layout.length > 0;
  const nActive = activeFilterCount(filters);

  const apply = (patch: Partial<ListingFilters>) => {
    const next = { ...filters, ...patch };
    startTransition(() => router.push(`${basePath}${filtersToSearch(next)}`, { scroll: false }));
  };
  const clearAll = () => apply({ cond: [], colour: [], layout: [], min: null, max: null, stock: false, cod: false });

  const more = async () => {
    setLoadingMore(true);
    try {
      const r = await api.store.products({ ...filtersToQuery(filters, scope), page: page + 1, pageSize: PAGE_SIZE });
      setItems((s) => [...s, ...r.items.filter((x) => !s.some((y) => y.id === x.id))]);
      setPage((p) => p + 1);
    } catch {
      toast('Couldn’t load more parts. Please try again.', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const chips: { label: string; clear: Partial<ListingFilters> }[] = [
    ...filters.cond.map((c) => ({ label: CONDITION_SHORT[c], clear: { cond: filters.cond.filter((x) => x !== c) } })),
    ...filters.colour.map((c) => ({ label: c, clear: { colour: filters.colour.filter((x) => x !== c) } })),
    ...filters.layout.map((c) => ({ label: `${c} layout`, clear: { layout: filters.layout.filter((x) => x !== c) } })),
    ...(filters.min || filters.max ? [{ label: `₹${filters.min ?? 0}–${filters.max ? `₹${filters.max}` : 'max'}`, clear: { min: null, max: null } }] : []),
    ...(filters.stock ? [{ label: 'In stock', clear: { stock: false } }] : []),
    ...(filters.cod ? [{ label: 'COD', clear: { cod: false } }] : []),
  ];

  const pill = (active: boolean) =>
    cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13px] font-medium transition', active ? 'bg-fg text-bg' : 'bg-surface-2 text-fg hover:bg-line-subtle');

  return (
    <div className={cn('transition-opacity', pending && 'opacity-60')} aria-busy={pending}>
      {/* Category pills */}
      {facetCats.length > 1 && (
        <nav aria-label="Categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" onClick={() => apply({ cat: null })} className={cn(pill(!filters.cat), 'pl-3.5')} aria-pressed={!filters.cat}>
            All parts <span className={cn('text-xs', !filters.cat ? 'text-bg/70' : 'text-subtle')}>{allCount}</span>
          </button>
          {facetCats.map(({ id, count, cat }) => {
            const on = activeCat?.id === id;
            return (
              <button key={id} type="button" onClick={() => apply({ cat: on ? null : cat!.slug, layout: [] })} className={pill(on)} aria-pressed={on}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={categoryRender(cat!)} alt="" className="size-6 rounded-full bg-surface object-contain p-0.5" loading="lazy" />
                {categoryShort(cat!)} <span className={cn('text-xs', on ? 'text-bg/70' : 'text-subtle')}>{count}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Desktop filters */}
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-20">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <SlidersHorizontal className="size-4" /> Filters
              </h2>
              {nActive > 0 && (
                <button onClick={clearAll} className="text-[13px] text-link hover:underline">
                  Clear all
                </button>
              )}
            </div>
            <FilterPanel facets={initial.facets} filters={filters} onChange={apply} showLayout={showLayout} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setSheet(true)} className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3.5 text-[13px] font-medium lg:hidden">
              <SlidersHorizontal className="size-4" /> Filters{nActive ? ` · ${nActive}` : ''}
            </button>
            <p className="hidden text-[13px] text-muted lg:block" aria-live="polite">
              {items.length < initial.total ? `${items.length} of ${initial.total}` : initial.total} part{initial.total === 1 ? '' : 's'}
            </p>
            {chips.map((c) => (
              <button key={c.label} type="button" onClick={() => apply(c.clear)} className="hidden items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs hover:bg-line-subtle lg:inline-flex" aria-label={`Remove filter ${c.label}`}>
                <X className="size-3" /> {c.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden whitespace-nowrap text-[13px] text-muted sm:inline lg:hidden">{initial.total} parts</span>
              <label htmlFor="sort" className="sr-only">
                Sort
              </label>
              <Select id="sort" value={filters.sort} onChange={(e) => apply({ sort: e.target.value as SortKey })} className="h-9 w-auto max-w-[200px] rounded-full pl-3.5 text-[13px]">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    Sort: {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-[var(--radius-tile)] bg-bg-2">
              <EmptyState
                icon={<PackageSearch className="size-6" />}
                title="No parts match"
                body={nActive ? 'Try removing a filter or two.' : 'We don’t have this in stock right now — message us and we’ll source it for you.'}
                action={
                  nActive ? (
                    <Button variant="secondary" onClick={clearAll}>
                      Clear filters
                    </Button>
                  ) : (
                    <a href={waLink(config.whatsapp, 'Hi Unibody, can you source a part for me?')} target="_blank" rel="noreferrer" className="text-sm font-medium text-link hover:underline">
                      Ask on WhatsApp
                    </a>
                  )
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {items.length < initial.total && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Button variant="secondary" size="lg" onClick={more} loading={loadingMore}>
                Show more parts
              </Button>
              <p className="text-xs text-subtle">
                Showing {items.length} of {initial.total}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-[var(--overlay)]" onClick={() => setSheet(false)} />
          <div className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line-subtle px-5 py-4">
              <h2 className="text-[17px] font-semibold">Filters</h2>
              <div className="flex items-center gap-3">
                {nActive > 0 && (
                  <button onClick={clearAll} className="text-[13px] text-link">
                    Clear all
                  </button>
                )}
                <button onClick={() => setSheet(false)} aria-label="Close filters" className="inline-flex size-8 items-center justify-center rounded-full bg-surface-2">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <FilterPanel facets={initial.facets} filters={filters} onChange={apply} showLayout={showLayout} />
            </div>
            <div className="border-t border-line-subtle p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <Button className="w-full" size="lg" onClick={() => setSheet(false)}>
                {pending ? <Spinner className="text-on-accent" /> : `Show ${initial.total} part${initial.total === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Not sure which part you need?" WhatsApp band (D02 footer). */
export function HelpBand() {
  const config = useStoreConfig();
  return (
    <div className="mt-16 flex flex-col items-start gap-4 rounded-[var(--radius-tile)] bg-hero p-6 text-hero-fg sm:flex-row sm:items-center sm:p-8" style={{ backgroundImage: 'radial-gradient(80% 140% at 100% 50%, rgb(88 86 214 / 0.45), transparent 70%)' }}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-vivid-green text-white">
        <MessageCircle className="size-6" />
      </span>
      <div className="flex-1">
        <p className="text-[19px] font-semibold">Not sure which part you need?</p>
        <p className="mt-0.5 text-[13px] text-hero-muted">Send a photo of the bottom case — our technicians reply on WhatsApp within 15 minutes, 10am–8pm.</p>
      </div>
      <a href={waLink(config.whatsapp, 'Hi Unibody, which part do I need? Sending a photo of my bottom case.')} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-white/90">
        Chat on WhatsApp
      </a>
    </div>
  );
}

