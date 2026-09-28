'use client';
import { useEffect, useRef } from 'react';
/** Keep list filters in the URL (shareable, survives reload) without triggering a navigation. */
export function syncQuery(params: Record<string, string | number | undefined | null | false>) {
  const u = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false || v === 'ALL' || (k === 'page' && v === 1)) u.searchParams.delete(k);
    else u.searchParams.set(k, String(v));
  }
  window.history.replaceState(window.history.state, '', u.pathname + (u.search ? u.search : ''));
}

/** Reset pagination to page 1 when filters change (but not on first render). */
export function useResetPage(setPage: (p: number) => void, deps: React.DependencyList) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
