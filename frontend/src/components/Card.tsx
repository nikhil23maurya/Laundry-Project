import { cn } from "../lib/cn";
import type { ReactNode } from "react";

export function Card({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("surface p-5", className)}>{children}</div>;
}
