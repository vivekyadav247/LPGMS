import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "control-base min-h-28 py-3.5",
        className,
      )}
      {...props}
    />
  );
}
