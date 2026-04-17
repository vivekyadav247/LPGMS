export function Loader({ label = "Loading..." }) {
  return (
    <div className="surface-muted flex min-h-48 items-center justify-center">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
        <span className="h-3 w-3 animate-pulse rounded-full bg-accent shadow-panel" />
        {label}
      </div>
    </div>
  );
}
