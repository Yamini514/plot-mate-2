"use client";

import { useState, useCallback } from "react";

// Shared list controls — pagination + sort — for tables backed by the standard
// backend list envelope (total / page / pageSize / totalPages + the allow-listed
// `sort`/`dir` params). Spread `query` into useApi alongside the page's own
// filters; pair `sort`/`dir`/`toggleSort` with <SortTh> and `page`/`pageSize`
// with <Pagination>. Changing a filter should still reset to page 1 — call
// `setPage(1)` from the filter handler, matching the existing pages.
export function useListControls({ pageSize = 25, sort = "created_at", dir = "desc" } = {}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [sortKey, setSortKey] = useState(sort);
  const [sortDir, setSortDir] = useState(dir);

  // Click a column: same key flips direction, a new key starts ascending.
  const toggleSort = useCallback(
    (key) => {
      setPage(1);
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const setPageSize = useCallback((n) => {
    setSize(n);
    setPage(1);
  }, []);

  return {
    page,
    setPage,
    pageSize: size,
    setPageSize,
    sort: sortKey,
    dir: sortDir,
    toggleSort,
    // Backend reads these exact snake_case query keys.
    query: { page, page_size: size, sort: sortKey, dir: sortDir },
  };
}
