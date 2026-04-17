import { X } from "lucide-react";

import { Button } from "./Button";

export function Modal({ open, title, description, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 px-4 py-6 backdrop-blur-sm sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="surface overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-ink">{title}</h3>
              {description ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {description}
                </p>
              ) : null}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
