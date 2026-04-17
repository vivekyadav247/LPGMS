import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { Loader } from "./components/ui/Loader";
import { useAuth } from "./context/AuthContext";

const CustomerLedgerPage = lazy(async () => {
  const module = await import("./pages/CustomerLedgerPage");
  return { default: module.CustomerLedgerPage };
});
const CustomersPage = lazy(async () => {
  const module = await import("./pages/CustomersPage");
  return { default: module.CustomersPage };
});
const DashboardPage = lazy(async () => {
  const module = await import("./pages/DashboardPage");
  return { default: module.DashboardPage };
});
const LoginPage = lazy(async () => {
  const module = await import("./pages/LoginPage");
  return { default: module.LoginPage };
});
const NewEntryPage = lazy(async () => {
  const module = await import("./pages/NewEntryPage");
  return { default: module.NewEntryPage };
});
const StockPage = lazy(async () => {
  const module = await import("./pages/StockPage");
  return { default: module.StockPage };
});
const TransactionsPage = lazy(async () => {
  const module = await import("./pages/TransactionsPage");
  return { default: module.TransactionsPage };
});

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <Loader label="Checking session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <Loader label="Preparing app..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-4">
          <Loader label="Loading screen..." />
        </div>
      }
    >
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/entries/new" element={<NewEntryPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerLedgerPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
