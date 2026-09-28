import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { KEYS, loadRaw, saveJSON } from '@/lib/storage';
import { PALETTES, type Palette, type Scheme, type ThemePreference } from './tokens';

interface ThemeCtx {
  scheme: Scheme;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  ready: boolean;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadRaw<ThemePreference>(KEYS.theme).then((p) => {
      if (p === 'light' || p === 'dark' || p === 'system') setPref(p);
      setReady(true);
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    saveJSON(KEYS.theme, p);
  }, []);

  // Keep native chrome (alerts, keyboards, pickers) in sync with the in-app override.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    } catch {
      // older runtimes
    }
  }, [preference]);

  const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({ scheme, colors: PALETTES[scheme], preference, setPreference, ready }), [scheme, preference, setPreference, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}
