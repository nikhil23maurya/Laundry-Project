import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";
import { cn } from "../lib/cn";
import type { ReactNode } from "react";

function Item({
  to,
  label
}: {
  to: string;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition border",
          isActive
            ? "bg-white/10 border-white/10"
            : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
        )
      }
    >
      <span>{label}</span>
    </NavLink>
  );
}

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-lg font-extrabold tracking-tight">
                  CYNTROVA OMS
                </div>
                <div className="text-xs text-slate-300">
                  Laundry Order Management
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-1">
              {user?.role === "customer" ? null : <Item to="/" label="Dashboard" />}
              <Item to="/orders" label="Orders" />
              <Item to="/orders/new" label="New Order" />
              {user?.role === "admin" ? (
                <Item to="/settings" label="Admin Settings" />
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-sm font-bold">{user?.name}</div>
              <div className="text-xs text-slate-300">{user?.email}</div>
              <div className="mt-2 text-[11px] uppercase tracking-widest text-slate-400">
                {user?.role}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="btn-ghost flex-1"
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400">
              API: <span className="font-mono">/api</span>
            </div>
          </aside>

          <main className="glass rounded-2xl p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
