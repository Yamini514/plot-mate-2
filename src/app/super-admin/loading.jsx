// Route-level skeleton for the super-admin segment. Renders inside the AppShell
// (sidebar/topbar stay put) while the page's chunk loads — most visible on the
// first hit to a route (dev on-demand compilation) where there's nothing cached.
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
