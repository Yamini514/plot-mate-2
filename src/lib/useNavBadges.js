"use client";

import { useApi, useDeferred } from "./useApi";

/**
 * Live "needs attention" counts for the sidebar, keyed by nav href.
 * Hooks are always called (Rules of Hooks); a null path makes useApi a no-op
 * so each role only fetches what it needs.
 *
 * These counts are decorative, so we defer the fetches until after the active
 * page's primary data has had a chance to load — otherwise they'd compete for
 * the small backend connection pool and slow the first paint (e.g. the
 * dashboard right after login).
 */
export function useNavBadges(role) {
  const admin = role === "admin";
  const guard = role === "guard";
  const member = role === "member";
  const ready = useDeferred(800);

  // Admin — unpaid invoices, open tickets, open complaints.
  const { data: invSum } = useApi(admin && ready ? "/admin/billing/invoices/summary" : null);
  const { data: tickSum } = useApi(admin && ready ? "/admin/helpdesk/tickets/summary" : null);
  const { data: compSum } = useApi(admin && ready ? "/admin/complaints/summary" : null);

  // Guard — expected visitors at the gate, deliveries awaiting pickup.
  const { data: gVisitors } = useApi(guard && ready ? "/guard/visitors" : null, { page_size: 300 });
  const { data: gDeliveries } = useApi(guard && ready ? "/guard/deliveries" : null, { page_size: 300 });

  // Member — visitor pre-approvals awaiting the resident's decision.
  const { data: mVisitors } = useApi(member && ready ? "/member/visitors" : null, { page_size: 300 });

  const badges = {};

  if (admin) {
    if (invSum?.unpaidCount) badges["/admin/billing"] = invSum.unpaidCount;
    if (tickSum?.open) badges["/admin/helpdesk"] = tickSum.open;
    if (compSum?.open) badges["/admin/complaints"] = compSum.open;
  }

  if (guard) {
    const v = Array.isArray(gVisitors) ? gVisitors : [];
    const expected = v.filter((x) => x.status === "expected" || x.status === "pending").length;
    if (expected) badges["/guard/visitors"] = expected;
    const d = Array.isArray(gDeliveries) ? gDeliveries : [];
    const waiting = d.filter((x) => ["waiting", "received"].includes(x.status)).length;
    if (waiting) badges["/guard/deliveries"] = waiting;
  }

  if (member) {
    const v = Array.isArray(mVisitors) ? mVisitors : [];
    const pending = v.filter((x) => x.status === "pending").length;
    if (pending) badges["/member/visitors"] = pending;
  }

  return badges;
}
