import 'server-only';
import type { CategoryDTO, ProductListDTO } from '@unibody/shared';
import { serverApi } from '@/lib/api-server';
import { getCategories } from './data';
import { filtersToQuery, filtersToSearch, PAGE_SIZE, parseFilters, type ListingFilters } from './filters';

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export interface LoadedListing {
  list: ProductListDTO;
  filters: ListingFilters;
  categories: CategoryDTO[];
  /** Stable key so the client listing resets when filters change */
  key: string;
}

export async function loadListing(searchParams: SearchParams, scope: { family?: string; model?: string }): Promise<LoadedListing> {
  const filters = parseFilters(await searchParams);
  const [list, categories] = await Promise.all([
    serverApi.store.products({ ...filtersToQuery(filters, scope), page: 1, pageSize: PAGE_SIZE }),
    getCategories().catch((): CategoryDTO[] => []),
  ]);
  return { list, filters, categories, key: `${scope.family ?? ''}|${scope.model ?? ''}|${filtersToSearch(filters)}` };
}
