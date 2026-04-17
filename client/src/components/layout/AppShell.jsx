import {
  Boxes,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  ScrollText,
  Users,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

const navItems = [
  { to: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  {
    to: "/entries/new",
    label: "New Entry",
    shortLabel: "Entry",
    icon: PlusCircle,
  },
  { to: "/customers", label: "Customers", shortLabel: "Party", icon: Users },
  { to: "/stock", label: "Stock", shortLabel: "Stock", icon: Boxes },
  {
    to: "/transactions",
    label: "Ledger Table",
    shortLabel: "Table",
    icon: ScrollText,
  },
];

function isActiveRoute(item, pathname) {
  if (item.to === "/") {
    return pathname === "/";
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function getCurrentItem(pathname) {
  return navItems.find((item) => isActiveRoute(item, pathname));
}

export function AppShell({ children }) {
  const { auth, logout } = useAuth();
  const location = useLocation();
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const currentItem = getCurrentItem(location.pathname);

  return (
    <div className="min-h-screen bg-shell pb-32 lg:pb-10">
      <div className="mx-auto flex max-w-[1440px] gap-4 px-3 py-3 sm:px-5 lg:gap-6 lg:px-6 lg:py-4">
        <aside className="surface-ink hidden min-h-[calc(100vh-2rem)] w-[300px] flex-col overflow-hidden px-6 py-6 lg:flex">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5">
            <img
              src="/LPGMS_Logo.png"
              alt="LPGMS logo"
              className="h-24 w-auto"
              loading="eager"
            />
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-[1.35rem] border border-transparent px-4 py-3.5 text-sm font-semibold text-white/70 transition",
                      "hover:border-white/10 hover:bg-white/[0.08] hover:text-white",
                      isActive &&
                        "border-white/20 bg-white text-ink shadow-panel",
                    )
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Operator
              </p>
              <p className="mt-3 text-lg font-semibold">
                {auth?.admin?.name || "Admin"}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {auth?.admin?.phone || auth?.admin?.email || "Operator"}
              </p>
            </div>

            <Button variant="secondary" className="w-full" onClick={logout}>
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 sm:mb-6">
            <div className="surface-muted overflow-hidden">
              <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mt-2 flex items-center justify-between gap-3 sm:mt-3">
                    <h2 className="truncate text-2xl font-bold tracking-tight text-ink sm:text-[2rem]">
                      {currentItem?.label || "Operations"}
                    </h2>
                    <img
                      src="/LPGMS_Logo.png"
                      alt="LPGMS logo"
                      className="h-14 w-24 shrink-0 rounded-xl border border-accent/15 bg-white object-contain p-1.5 shadow-panel lg:hidden"
                      loading="eager"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="hidden rounded-[1.2rem] border border-white/80 bg-white px-4 py-3 text-right shadow-panel sm:block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Logged in
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {auth?.admin?.name || "Admin"}
                    </p>
                  </div>

                  <Link to="/entries/new" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto">
                      <PlusCircle size={18} />
                      Quick add entry
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">{children}</div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-3 z-40 mx-auto flex max-w-xl px-3 lg:hidden">
        <div className="surface-muted w-full p-2">
          <div className="grid grid-cols-5 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(item, location.pathname);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-[1.35rem] px-2 text-[11px] font-semibold text-slate-500 transition",
                    active && "bg-accent text-white shadow-panel",
                  )}
                >
                  <Icon size={18} />
                  <span>{item.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
