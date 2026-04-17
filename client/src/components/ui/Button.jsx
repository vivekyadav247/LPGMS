import { cn } from "../../lib/utils";

export function Button({
  className,
  children,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}) {
  const variants = {
    primary:
      "border border-accent bg-accent text-white shadow-panel hover:bg-accent/92 hover:shadow-soft active:translate-y-[1px] disabled:border-accent/60 disabled:bg-accent/60",
    secondary:
      "border border-slate-200 bg-white text-ink shadow-panel hover:bg-slate-50 hover:border-slate-300 active:translate-y-[1px] disabled:bg-white/70",
    ghost:
      "border border-transparent bg-transparent text-ink hover:bg-white/70 hover:text-accent",
    danger:
      "border border-danger bg-danger text-white shadow-panel hover:bg-danger/92 active:translate-y-[1px] disabled:border-danger/60 disabled:bg-danger/60",
  };

  const sizes = {
    sm: "min-h-10 rounded-xl px-3.5 text-sm",
    md: "min-h-12 rounded-[1.2rem] px-[1.125rem] text-sm",
    lg: "min-h-14 rounded-[1.35rem] px-5 text-base",
    icon: "h-11 w-11 rounded-full p-0",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-70",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
