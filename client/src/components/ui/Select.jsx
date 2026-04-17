import { cn } from "../../lib/utils";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "control-base appearance-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
