"use client";

import { useApi } from "@/lib/useApi";

/**
 * RBAC permissions for the logged-in user, from GET /me/permissions.
 * Returns { can, all, loading } where:
 *   - all   = true for the venture owner-admin / super admin (every permission)
 *   - can(p) = whether the user holds permission "module.action"
 * While loading, can() returns false (fail-closed) — pair with `loading` to
 * avoid flashing a denied state. Non-admin roles never call this (no perm keys).
 */
export function usePermissions(enabled = true) {
  const { data, loading } = useApi(enabled ? "/me/permissions" : null);
  const all = !!data?.all;
  const list = Array.isArray(data?.permissions) ? data.permissions : [];
  const set = new Set(list);
  const can = (perm) => all || (!!perm && set.has(perm));
  return { can, all, permissions: list, loading };
}
