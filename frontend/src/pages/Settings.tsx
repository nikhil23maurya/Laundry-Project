import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { CatalogItem, Role } from "../lib/types";
import { useAuth } from "../state/auth";
import { Card } from "../components/Card";

type CatalogResponse = { items: CatalogItem[] };

export default function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => api<CatalogResponse>("/api/catalog", "GET")
  });

  const [draft, setDraft] = useState<Record<string, { unitPrice: number; active: boolean }>>({});

  const items = useMemo(() => {
    return data?.items ?? [];
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payloadItems = items.map((it) => {
        const d = draft[it.name];
        return {
          name: it.name,
          unitPrice: d ? d.unitPrice : it.unitPrice,
          active: d ? d.active : it.active === 1
        };
      });
      return api<CatalogResponse>("/api/catalog", "PUT", { items: payloadItems });
    },
    onSuccess: async () => {
      toast.success("Catalog updated.");
      setDraft({});
      await qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to update catalog.")
  });

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("staff");
  const [newUserPassword, setNewUserPassword] = useState("");

  const createUser = useMutation({
    mutationFn: async () => {
      return api<{ user: any }>("/api/auth/users", "POST", {
        email: newUserEmail,
        name: newUserName,
        role: newUserRole,
        password: newUserPassword
      });
    },
    onSuccess: () => {
      toast.success("User created.");
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("staff");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to create user.")
  });

  if (user?.role !== "admin") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Admin only.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-extrabold tracking-tight">Admin Settings</div>
        <div className="mt-1 text-sm text-slate-300">
          Manage garment catalog/prices and create staff accounts.
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {(error as any)?.message ?? "Failed to load."}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">Catalog & Pricing</div>
              <div className="text-xs text-slate-400">
                Updates affect new orders going forward.
              </div>
            </div>
            <button className="btn-primary" disabled={save.isPending || isLoading} onClick={() => save.mutate()}>
              Save
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {items.map((it) => {
              const d = draft[it.name];
              const unitPrice = d ? d.unitPrice : it.unitPrice;
              const active = d ? d.active : it.active === 1;
              return (
                <div key={it.id} className="grid grid-cols-[1fr_140px_90px] gap-2 items-center">
                  <div className="font-semibold">{it.name}</div>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    value={unitPrice}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setDraft((prev) => ({
                        ...prev,
                        [it.name]: { unitPrice: Number.isFinite(value) ? value : 0, active }
                      }));
                    }}
                  />
                  <button
                    className={active ? "btn-ghost" : "btn-primary"}
                    onClick={() => {
                      setDraft((prev) => ({
                        ...prev,
                        [it.name]: { unitPrice, active: !active }
                      }));
                    }}
                  >
                    {active ? "Active" : "Off"}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-bold">Create Staff User</div>
          <div className="mt-1 text-xs text-slate-400">
            Creates a new user that can log in and manage orders.
          </div>

          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate();
            }}
          >
            <input
              className="field"
              placeholder="Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              required
            />
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
            />
            <select
              className="field"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as Role)}
            >
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
            <input
              className="field"
              type="password"
              placeholder="Password (min 8 chars)"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              minLength={8}
              required
            />
            <button className="btn-primary w-full" disabled={createUser.isPending}>
              Create User
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

