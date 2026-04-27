import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";
import { Spinner } from "../components/Spinner";
import { api } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"admin" | "customer">("admin");
  const [email, setEmail] = useState("admia@gmail.com");
  const [password, setPassword] = useState("assignment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

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

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={mode === "admin" ? "btn-primary" : "btn-ghost"}
              onClick={() => {
                setMode("admin");
                setError(null);
                setEmail("admia@gmail.com");
                setPassword("assignment");
              }}
            >
              Admin Login
            </button>
            <button
              type="button"
              className={mode === "customer" ? "btn-primary" : "btn-ghost"}
              onClick={() => {
                setMode("customer");
                setError(null);
                setEmail("");
                setPassword("");
              }}
            >
              Customer Login
            </button>
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
                placeholder={mode === "admin" ? "admia@gmail.com" : "you@email.com"}
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
                mode === "admin" ? "Sign in as Admin" : "Sign in as Customer"
              )}
            </button>
          </form>

          {mode === "admin" ? (
            <div className="mt-6 text-xs text-slate-400">
              Fixed admin credentials:
              <div className="mt-1 font-mono">
                admia@gmail.com / assignment
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-extrabold tracking-tight">
                New customer? Create account
              </div>
              <div className="mt-1 text-xs text-slate-400">
                After signup, login using the same email/password.
              </div>

              {registerError ? (
                <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {registerError}
                </div>
              ) : null}

              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setRegisterError(null);
                  setRegisterLoading(true);
                  try {
                    await api("/api/auth/register", "POST", {
                      name,
                      email: registerEmail,
                      password: registerPassword
                    });
                    setEmail(registerEmail);
                    setPassword(registerPassword);
                    setRegisterEmail("");
                    setRegisterPassword("");
                    setName("");
                  } catch (err: any) {
                    setRegisterError(err?.message ?? "Signup failed.");
                  } finally {
                    setRegisterLoading(false);
                  }
                }}
              >
                <input
                  className="field"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  className="field"
                  placeholder="Email"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
                <input
                  className="field"
                  placeholder="Password (min 8 chars)"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button className="btn-ghost w-full" disabled={registerLoading}>
                  {registerLoading ? (
                    <>
                      <Spinner /> Creating…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

