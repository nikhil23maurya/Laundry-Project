import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { OrderListResponse, OrderStatus, OrderListItem } from "../lib/types";
import { StatusBadge } from "../components/Badge";
import { Card } from "../components/Card";
import toast from "react-hot-toast";
import { Modal } from "../components/Modal";

const STATUSES: Array<{ label: string; value: "" | OrderStatus }> = [
  { label: "All", value: "" },
  { label: "Received", value: "RECEIVED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Ready", value: "READY" },
  { label: "Delivered", value: "DELIVERED" }
];

function formatMoney(amount: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    amount
  );
}

function nextStatus(status: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];
  const idx = flow.indexOf(status);
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
}

export default function Orders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [garment, setGarment] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageSize = 20;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    if (garment.trim()) params.set("garment", garment.trim());
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return params.toString();
  }, [status, search, garment, page]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", queryString],
    queryFn: () => api<OrderListResponse>(`/api/orders?${queryString}`, "GET")
  });

  const orderDetails = useQuery({
    queryKey: ["order", selectedId],
    queryFn: () => api<any>(`/api/orders/${selectedId}`, "GET"),
    enabled: Boolean(selectedId)
  });

  const advance = useMutation({
    mutationFn: async (order: OrderListItem) => {
      const ns = nextStatus(order.status);
      if (!ns) return;
      await api(`/api/orders/${order.id}/status`, "PATCH", { status: ns });
    },
    onSuccess: async () => {
      toast.success("Status updated.");
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to update status.")
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-extrabold tracking-tight">Orders</div>
          <div className="mt-1 text-sm text-slate-300">
            Search, filter, and move orders through the workflow.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-widest text-slate-400">
              Status
            </div>
            <select
              className="field"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as any);
              }}
            >
              {STATUSES.map((s) => (
                <option key={s.label} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-widest text-slate-400">
              Search
            </div>
            <input
              className="field"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Name, phone, or order id"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-widest text-slate-400">
              Garment
            </div>
            <input
              className="field"
              value={garment}
              onChange={(e) => {
                setPage(1);
                setGarment(e.target.value);
              }}
              placeholder="e.g., Saree"
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {(error as any)?.message ?? "Failed to load orders."}
        </div>
      ) : null}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Order</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : (data?.data?.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={6}>
                    No orders found.
                  </td>
                </tr>
              ) : (
                data?.data?.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => setSelectedId(o.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {o.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">{o.customerName}</td>
                    <td className="px-4 py-3 text-slate-300">{o.phone}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ₹ {formatMoney(o.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="btn-ghost"
                        disabled={!nextStatus(o.status) || advance.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          advance.mutate(o);
                        }}
                        title="Advance to next status"
                      >
                        Advance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <div className="text-xs text-slate-400">
            Page {data?.pageInfo.page ?? page} of {data?.pageInfo.totalPages ?? 1} •{" "}
            {data?.pageInfo.total ?? 0} orders
          </div>
          <div className="flex gap-2">
            <button
              className="btn-ghost"
              disabled={(data?.pageInfo.page ?? page) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="btn-ghost"
              disabled={(data?.pageInfo.page ?? page) >= (data?.pageInfo.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      <Modal
        open={Boolean(selectedId)}
        title="Order Details"
        onClose={() => setSelectedId(null)}
      >
        {orderDetails.isLoading ? (
          <div className="text-sm text-slate-300">Loading…</div>
        ) : orderDetails.error ? (
          <div className="text-sm text-red-200">
            {(orderDetails.error as any)?.message ?? "Failed to load order."}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-widest text-slate-400">
                  Order ID
                </div>
                <div className="font-mono text-sm">{orderDetails.data.id}</div>
              </div>
              <StatusBadge status={orderDetails.data.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-widest text-slate-400">
                  Customer
                </div>
                <div className="mt-1 font-semibold">{orderDetails.data.customerName}</div>
                <div className="text-sm text-slate-300">{orderDetails.data.phone}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-widest text-slate-400">
                  Billing
                </div>
                <div className="mt-1 text-lg font-extrabold">
                  ₹ {formatMoney(orderDetails.data.totalAmount)}
                </div>
                <div className="text-xs text-slate-400">
                  Est. ready:{" "}
                  {orderDetails.data.estimatedReadyAt
                    ? new Date(orderDetails.data.estimatedReadyAt).toLocaleString()
                    : "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-bold">Items</div>
              <div className="mt-2 space-y-2 text-sm">
                {orderDetails.data.items.map((it: any) => (
                  <div key={it.id} className="flex items-center justify-between">
                    <div className="text-slate-300">
                      {it.name} × {it.quantity}
                    </div>
                    <div className="font-semibold">
                      ₹ {formatMoney(it.lineTotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-bold">Timeline</div>
              <div className="mt-2 space-y-2 text-sm text-slate-300">
                {orderDetails.data.events.map((ev: any) => (
                  <div key={ev.id} className="flex items-center justify-between gap-3">
                    <div className="font-mono text-xs">
                      {ev.fromStatus ? `${ev.fromStatus} → ` : ""}
                      {ev.toStatus}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(ev.changedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
