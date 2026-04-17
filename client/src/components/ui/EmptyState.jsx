export function EmptyState({ title, description }) {
  return (
    <div className="surface-muted flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center">
      <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Empty
      </div>
      <h4 className="mt-4 text-xl font-bold text-ink">{title}</h4>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
