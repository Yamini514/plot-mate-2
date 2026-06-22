"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/**
 * Returns false on mount, then true after `ms`. Pair with useApi's null-path
 * skip to defer non-critical fetches so they don't contend for the (small)
 * backend connection pool while the page's primary data loads:
 *   const ready = useDeferred();
 *   const { data } = useApi(ready ? "/secondary" : null);
 */
export function useDeferred(ms = 600) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return ready;
}

/** Debounce a fast-changing value (e.g. a search box) before using it. */
export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Fetch a list/object from the backend with loading + error state.
 * Returns { data, meta (counts/totalPages/etc.), loading, error, reload }.
 */
export function useApi(path, query) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const qkey = JSON.stringify(query ?? {});

  const reload = useCallback(async () => {
    // A null/empty path means "don't fetch" — lets callers fetch conditionally
    // while still calling this hook unconditionally (Rules of Hooks).
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: payload, ...extras } = await api.get(path, query);
      setData(payload);
      setMeta(extras);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, qkey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/param change
    reload();
  }, [reload]);

  return { data, meta, loading, error, reload };
}
