export function PanelHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h4 className="mt-1 text-lg font-bold text-ink sm:text-xl">{title}</h4>
        {description ? (
          <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>

      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
