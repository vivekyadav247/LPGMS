import { cn } from "../../lib/utils";

const variants = {
  default: "surface",
  muted: "surface-muted",
  ink: "surface-ink",
};

export function Card({ className, children, variant = "default" }) {
  return (
    <div
      className={cn(
        variants[variant] || variants.default,
        "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
