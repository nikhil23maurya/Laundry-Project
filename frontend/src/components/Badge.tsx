import { cn } from "../lib/cn";
import type { OrderStatus } from "../lib/types";

const statusStyles: Record<OrderStatus, string> = {
  RECEIVED: "border-teal-400/30 bg-teal-400/10 text-teal-200",
  PROCESSING: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  READY: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  DELIVERED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn("badge", statusStyles[status])}>{status}</span>;
}

