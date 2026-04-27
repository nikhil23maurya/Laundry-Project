import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./state/auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import NewOrder from "./pages/NewOrder";
import Settings from "./pages/Settings";
import type { ReactNode } from "react";

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <Protected>
            <Shell />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<NewOrder />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
