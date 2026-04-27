import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { CatalogItem } from "../lib/types";
import { Card } from "../components/Card";
import { Spinner } from "../components/Spinner";
import { useNavigate } from "react-router-dom";

type CatalogResponse = { items: CatalogItem[] };

type ItemDraft = {
  name: string;
  quantity: number;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    amount
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => api<CatalogResponse>("/api/catalog", "GET")
  });

  const activeCatalog = useMemo(() => {
    return (catalogData?.items ?? []).filter((i) => i.active === 1);
  }, [catalogData]);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ name: "Shirt", quantity: 1 }]);

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activeCatalog) {
      map.set(item.name, item.unitPrice);
    }
    return map;
  }, [activeCatalog]);

  const total = useMemo(() => {
    return items.reduce((sum, it) => {
      const unit = priceMap.get(it.name) ?? 0;
      return sum + unit * it.quantity;
    }, 0);
  }, [items, priceMap]);

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        customerName,
        phone,
        items: items.map((i) => ({ name: i.name, quantity: i.quantity }))
      };
      return api<{
        orderId: string;
        totalAmount: number;
        status: string;
        estimatedReadyAt: string;
      }>("/api/orders", "POST", payload);
    },
    onSuccess: async (data) => {
      toast.success(`Order created: ${data.orderId.slice(0, 8)}…`);
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/orders");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to create order.")
  });

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-extrabold tracking-tight">Create Order</div>
        <div className="mt-1 text-sm text-slate-300">
          Add garments, quantities, and the system calculates billing automatically.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs uppercase tracking-widest text-slate-400">
                  Customer
                </div>
                <input
                  className="field"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Asha Patel"
                  required
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs uppercase tracking-widest text-slate-400">
                  Phone
                </div>
                <input
                  className="field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                />
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">Garments</div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    setItems((prev) => [...prev, { name: "Shirt", quantity: 1 }])
                  }
                >
                  Add
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_110px_90px] gap-2"
                  >
                    <select
                      className="field"
                      value={it.name}
                      disabled={catalogLoading}
                      onChange={(e) => {
                        const value = e.target.value;
                        setItems((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, name: value } : p))
                        );
                      }}
                    >
                      {activeCatalog.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} (₹ {formatMoney(c.unitPrice)})
                        </option>
                      ))}
                    </select>
                    <input
                      className="field"
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setItems((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? { ...p, quantity: Number.isFinite(value) ? value : 1 }
                              : p
                          )
                        );
                      }}
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={items.length <= 1}
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="btn-primary w-full"
              disabled={create.isPending || activeCatalog.length === 0}
            >
              {create.isPending ? (
                <>
                  <Spinner /> Creating…
                </>
              ) : (
                "Create Order"
              )}
            </button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-bold">Billing Preview</div>
          <div className="mt-1 text-xs text-slate-400">
            Uses the active admin-configured catalog prices.
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {items.map((it, idx) => {
              const unit = priceMap.get(it.name) ?? 0;
              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="text-slate-300">
                    {it.name} × {it.quantity}
                  </div>
                  <div className="font-semibold">₹ {formatMoney(unit * it.quantity)}</div>
                </div>
              );
            })}
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between">
              <div className="text-slate-300">Total</div>
              <div className="text-lg font-extrabold">₹ {formatMoney(total)}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

