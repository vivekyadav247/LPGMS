import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "control-base",
        className,
      )}
      {...props}
    />
  );
}
