import 'server-only';
import { cache } from 'react';
import type { CategoryDTO, DeviceFamilyDTO, StoreConfigDTO } from '@unibody/shared';
import { serverApi } from '@/lib/api-server';
import { FALLBACK_CONFIG } from './config';

/** Per-request memoised catalogue reads for Server Components. */
export const getStoreConfig = cache(async (): Promise<StoreConfigDTO> => {
  try {
    return await serverApi.store.config();
  } catch {
    return FALLBACK_CONFIG;
  }
});

export const getFamilies = cache(async (): Promise<DeviceFamilyDTO[]> => serverApi.store.families(true));

export const getCategories = cache(async (): Promise<CategoryDTO[]> => serverApi.store.categories());

export const getFamiliesSafe = cache(async (): Promise<DeviceFamilyDTO[]> => {
  try {
    return await getFamilies();
  } catch {
    return [];
  }
});
