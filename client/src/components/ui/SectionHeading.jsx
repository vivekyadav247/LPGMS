export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  compact = false,
}) {
  return (
    <div
      className={[
        compact
          ? "mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
          : "mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
      ].join(" ")}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <div className="inline-flex rounded-full border border-accent/20 bg-accent/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            {eyebrow}
          </div>
        ) : null}
        <h3
          className={
            compact
              ? "mt-2 text-xl font-bold leading-tight text-ink sm:text-2xl"
              : "mt-3 text-[1.75rem] font-bold leading-tight text-ink sm:text-[2rem]"
          }
        >
          {title}
        </h3>
        {description ? (
          <p
            className={
              compact
                ? "mt-1.5 max-w-2xl text-sm leading-6 text-slate-500"
                : "mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]"
            }
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:justify-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}
