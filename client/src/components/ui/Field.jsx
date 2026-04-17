export function Field({ label, hint, error, children }) {
  return (
    <label className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint ? (
          <span className="max-w-[12rem] text-right text-[11px] font-medium text-slate-400">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <span className="px-1 text-xs font-medium text-danger">{error}</span>
      ) : null}
    </label>
  );
}
