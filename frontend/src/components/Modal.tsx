import { cn } from "../lib/cn";
import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          "relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/70 shadow-soft"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="text-sm font-extrabold tracking-tight">{title}</div>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

