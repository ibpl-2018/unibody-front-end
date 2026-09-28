/**
 * Listing filters <-> URL search params. Kept short and human-readable:
 * /shop?cat=battery&cond=GENUINE_A,GENUINE_B&colour=Silver&min=500&max=25000&layout=US&stock=1&cod=1&sort=price_asc
 * Prices in the URL are rupees; the API wants paise.
 */
import { CONDITIONS, type Condition } from '@unibody/shared';

export type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'newest';
export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

export interface ListingFilters {
  cat: string | null;
  cond: Condition[];
  colour: string[];
  layout: string[];
  min: number | null;
  max: number | null;
  stock: boolean;
  cod: boolean;
  sort: SortKey;
  q: string;
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .flatMap((x) => x.split(','))
    .map((x) => x.trim())
    .filter(Boolean);
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export function parseFilters(sp: SP): ListingFilters {
  const sort = one(sp.sort) as SortKey;
  return {
    cat: one(sp.cat) || null,
    cond: list(sp.cond).filter((c): c is Condition => (CONDITIONS as readonly string[]).includes(c)),
    colour: list(sp.colour),
    layout: list(sp.layout).map((x) => x.toUpperCase()),
    min: num(sp.min),
    max: num(sp.max),
    stock: one(sp.stock) === '1',
    cod: one(sp.cod) === '1',
    sort: SORTS.some((s) => s.value === sort) ? sort : 'recommended',
    q: one(sp.q).trim(),
  };
}

export function filtersToSearch(f: Partial<ListingFilters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.cat) p.set('cat', f.cat);
  if (f.cond?.length) p.set('cond', f.cond.join(','));
  if (f.colour?.length) p.set('colour', f.colour.join(','));
  if (f.layout?.length) p.set('layout', f.layout.join(','));
  if (f.min) p.set('min', String(f.min));
  if (f.max) p.set('max', String(f.max));
  if (f.stock) p.set('stock', '1');
  if (f.cod) p.set('cod', '1');
  if (f.sort && f.sort !== 'recommended') p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** API query for store.products() */
export function filtersToQuery(f: ListingFilters, scope: { family?: string; model?: string }) {
  return {
    family: scope.family,
    model: scope.model,
    category: f.cat ?? undefined,
    condition: f.cond.length ? f.cond : undefined,
    colour: f.colour.length ? f.colour : undefined,
    layout: f.layout.length ? f.layout : undefined,
    q: f.q || undefined,
    minPrice: f.min ? f.min * 100 : undefined,
    maxPrice: f.max ? f.max * 100 : undefined,
    inStock: f.stock || undefined,
    cod: f.cod || undefined,
    sort: f.sort,
  };
}

export const activeFilterCount = (f: ListingFilters) => f.cond.length + f.colour.length + f.layout.length + (f.min || f.max ? 1 : 0) + (f.stock ? 1 : 0) + (f.cod ? 1 : 0);

export const PAGE_SIZE = 24;
