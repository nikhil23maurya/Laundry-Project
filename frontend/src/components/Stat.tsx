import { Card } from "./Card";
import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  hint
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </Card>
  );
}
