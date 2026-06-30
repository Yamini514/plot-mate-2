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
 * Stale-while-revalidate response cache, keyed by `path + query`. The previous
 * response for a key is rendered instantly on revisit (or filter switch) while a
 * fresh fetch runs in the background — so navigating back to a page no longer
 * resets to a blank spinner. It's per session/tab (module scope) and must be
 * cleared on sign-out so the next account never sees the previous one's data
 * (see clearApiCache, called from auth.logout).
 */
const cache = new Map();
const keyFor = (path, qkey) => `${path}?${qkey}`;

/** Drop every cached response. Call on sign-out (account switch in the same tab). */
export function clearApiCache() {
  cache.clear();
}

/**
 * Fetch a list/object from the backend with loading + error state.
 * Returns { data, meta (counts/totalPages/etc.), loading, error, reload }.
 *
 * Seeds from the SWR cache so a revisit paints immediately and only the cold
 * first load (nothing cached) shows the blocking spinner; cached views refresh
 * silently in the background.
 */
export function useApi(path, query) {
  const qkey = JSON.stringify(query ?? {});
  const seed = path ? cache.get(keyFor(path, qkey)) : undefined;

  const [data, setData] = useState(seed?.data ?? null);
  const [meta, setMeta] = useState(seed?.meta ?? {});
  // Block (spinner) only when there's nothing cached to show yet.
  const [loading, setLoading] = useState(!!path && !seed);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    // A null/empty path means "don't fetch" — lets callers fetch conditionally
    // while still calling this hook unconditionally (Rules of Hooks).
    if (!path) {
      setLoading(false);
      return;
    }
    const key = keyFor(path, qkey);
    const hit = cache.get(key);
    // Paint cached data instantly (covers both revisits and filter switches);
    // revalidate in the background. A cold load with no cache blocks on the
    // spinner as before.
    if (hit) {
      setData(hit.data);
      setMeta(hit.meta);
    }
    setLoading(!hit);
    setError(null);
    try {
      const { data: payload, ...extras } = await api.get(path, query);
      cache.set(key, { data: payload, meta: extras });
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
