'use client';
import { useEffect, useState } from 'react';
import type { CategoryDTO, DeviceFamilyDTO, DeviceModelDTO } from '@unibody/shared';
import { adminApi } from './api';

export interface CatalogLookups {
  families: DeviceFamilyDTO[];
  categories: CategoryDTO[];
  models: DeviceModelDTO[];
}

let cache: Promise<CatalogLookups> | null = null;
const load = () =>
  Promise.all([adminApi.admin.families(), adminApi.admin.categories(), adminApi.admin.models()]).then(([families, categories, models]) => ({
    families: [...families].sort((a, b) => a.sortOrder - b.sortOrder),
    categories: [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    models,
  }));

/** Families / categories / models, fetched once per session and shared by filters and editors. */
export function useCatalog(): { data: CatalogLookups | null; reload: () => void } {
  const [data, setData] = useState<CatalogLookups | null>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!cache) cache = load();
    let live = true;
    cache.then((d) => live && setData(d)).catch(() => {
      cache = null;
    });
    return () => {
      live = false;
    };
  }, [v]);
  return {
    data,
    reload: () => {
      cache = null;
      setV((x) => x + 1);
    },
  };
}
export const invalidateCatalogCache = () => {
  cache = null;
};
