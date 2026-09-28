import AsyncStorage from '@react-native-async-storage/async-storage';

/** JSON helpers around AsyncStorage that never throw (storage can be unavailable on web/private mode). */
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? ({ ...(fallback as object), ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadRaw<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    if (value === null || value === undefined) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best effort
  }
}

export const KEYS = {
  theme: 'pb.theme',
  cart: 'pb.cart',
  session: 'pb.session',
  recentOrders: 'pb.recentOrders',
  recentSearches: 'pb.recentSearches',
  myDevice: 'pb.myDevice',
  checkoutDraft: 'pb.checkoutDraft',
} as const;
