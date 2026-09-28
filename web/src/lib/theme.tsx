'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'auto';
const KEY = 'pb.theme';

/** Inline script placed in <head> so the right theme is applied before first paint (no flash). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;

const Ctx = createContext<{ pref: ThemePref; resolved: 'light' | 'dark'; setPref: (p: ThemePref) => void; toggle: () => void }>({
  pref: 'auto',
  resolved: 'light',
  setPref: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('auto');
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t === 'light' || t === 'dark') setPrefState(t);
    } catch {}
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      if (p === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {}
    if (p === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', p);
  }, []);

  const resolved: 'light' | 'dark' = pref === 'auto' ? (systemDark ? 'dark' : 'light') : pref;
  const toggle = useCallback(() => setPref(resolved === 'dark' ? 'light' : 'dark'), [resolved, setPref]);

  return <Ctx.Provider value={{ pref, resolved, setPref, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
