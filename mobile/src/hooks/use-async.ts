import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

import { errorMessage } from '@/lib/api';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  /** Re-run showing the full loading state. */
  reload: () => void;
  /** Re-run for pull-to-refresh (keeps current data visible). */
  refresh: () => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

/** Small data-fetching hook: cancels stale responses, exposes loading / error / refresh. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList, opts: { enabled?: boolean } = {}): AsyncState<T> {
  const enabled = opts.enabled ?? true;
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(async (mode: 'load' | 'refresh') => {
    const id = ++seq.current;
    if (mode === 'load') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fnRef.current();
      if (id === seq.current) setDataState(res);
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e));
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- this hook exists to fetch on dependency change
    run('load');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const setData = useCallback((u: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof u === 'function' ? (u as (p: T | undefined) => T)(prev) : u));
  }, []);

  return { data, error, loading: enabled && loadingState, refreshing, reload: () => run('load'), refresh: () => run('refresh'), setData };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
