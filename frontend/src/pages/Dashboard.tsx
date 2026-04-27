import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { api } from "../lib/api";
import { Stat } from "../components/Stat";
import { Card } from "../components/Card";
import type { OrderStatus } from "../lib/types";

type DashboardResponse = {
  totalOrders: number;
  totalRevenue: number;
  statusBreakdown: Record<OrderStatus, number>;
  last7Days: Array<{ day: string; revenue: number; orders: number }>;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    amount
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardResponse>("/api/dashboard", "GET")
  });

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {(error as any)?.message ?? "Failed to load dashboard."}
      </div>
    );
  }

  const totalOrders = data?.totalOrders ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-extrabold tracking-tight">Dashboard</div>
        <div className="mt-1 text-sm text-slate-300">
          Today’s overview of operations and revenue.
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total Orders"
          value={isLoading ? "…" : totalOrders}
          hint="All-time"
        />
        <Stat
          label="Total Revenue"
          value={isLoading ? "…" : `₹ ${formatMoney(totalRevenue)}`}
          hint="All-time"
        />
        <Stat
          label="Received"
          value={isLoading ? "…" : data?.statusBreakdown?.RECEIVED ?? 0}
        />
        <Stat
          label="Processing"
          value={isLoading ? "…" : data?.statusBreakdown?.PROCESSING ?? 0}
        />
        <Stat
          label="Ready"
          value={isLoading ? "…" : data?.statusBreakdown?.READY ?? 0}
        />
        <Stat
          label="Delivered"
          value={isLoading ? "…" : data?.statusBreakdown?.DELIVERED ?? 0}
        />
      </div>

      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-sm font-bold">Revenue (Last 7 days)</div>
            <div className="text-xs text-slate-400">
              Aggregated by order creation date
            </div>
          </div>
        </div>

        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.last7Days ?? []} margin={{ left: 6, right: 6 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="rgba(148,163,184,0.6)" fontSize={12} />
              <YAxis stroke="rgba(148,163,184,0.6)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  color: "white"
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#60a5fa"
                fill="url(#rev)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

