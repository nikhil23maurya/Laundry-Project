import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";
import { Spinner } from "../components/Spinner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@laundry.local");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="glass rounded-3xl p-7">
          <div className="text-center">
            <div className="text-2xl font-extrabold tracking-tight">
              CYNTROVA Laundry OMS
            </div>
            <div className="mt-2 text-sm text-slate-300">
              Sign in to manage orders, status, and billing.
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                await login(email, password);
                navigate("/");
              } catch (err: any) {
                setError(err?.message ?? "Login failed.");
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="block">
              <div className="mb-1 text-xs uppercase tracking-widest text-slate-400">
                Email
              </div>
              <input
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@laundry.local"
                type="email"
                autoComplete="username"
                required
              />
            </label>

            <label className="block">
              <div className="mb-1 text-xs uppercase tracking-widest text-slate-400">
                Password
              </div>
              <input
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Spinner />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 text-xs text-slate-400">
            If this is a fresh DB, the server prints the seeded admin password to
            the console on first start.
          </div>
        </div>
      </div>
    </div>
  );
}

