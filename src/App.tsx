import { lazy, Suspense, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Auth } from "./components/auth/Auth";
import { ErrorBoundary, ErrorMessage, LoadingSpinner } from "./components/common";
import { keys, useLogout, useSessionQuery } from "./queries";
import { SessionProvider } from "./session";

const DashboardView = lazy(() =>
  import("./components/dashboard/DashboardView").then((m) => ({ default: m.DashboardView })),
);
const AccountsView = lazy(() =>
  import("./components/accounts/AccountsView").then((m) => ({ default: m.AccountsView })),
);
const TransactionsView = lazy(() =>
  import("./components/transactions/TransactionsView").then((m) => ({
    default: m.TransactionsView,
  })),
);
const SettingsView = lazy(() =>
  import("./components/settings/SettingsView").then((m) => ({ default: m.SettingsView })),
);
const CardsView = lazy(() =>
  import("./components/cards/CardsView").then((m) => ({ default: m.CardsView })),
);
const LoansView = lazy(() =>
  import("./components/loans/LoansView").then((m) => ({ default: m.LoansView })),
);
const BudgetsView = lazy(() =>
  import("./components/budgets/BudgetsView").then((m) => ({ default: m.BudgetsView })),
);

type View = "dashboard" | "transactions" | "accounts" | "cards" | "loans" | "budgets" | "settings";

const navigation: [View, string][] = [
  ["dashboard", "Resumen"],
  ["transactions", "Movimientos"],
  ["accounts", "Cuentas"],
  ["cards", "Tarjetas"],
  ["loans", "Préstamos"],
  ["budgets", "Presupuestos"],
  ["settings", "Configuración"],
];

export function App() {
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const [view, setView] = useState<View>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = useLogout(session.data?.csrf_token ?? "");

  if (session.isPending) return <p className="muted">Cargando...</p>;
  if (!session.data) {
    return <Auth onSession={(next) => queryClient.setQueryData(keys.session, next)} />;
  }

  const activeSession = session.data;

  const views: Record<View, ReactNode> = {
    dashboard: <DashboardView />,
    transactions: <TransactionsView />,
    accounts: <AccountsView />,
    cards: <CardsView />,
    loans: <LoansView />,
    budgets: <BudgetsView />,
    settings: <SettingsView />,
  };

  return (
    <SessionProvider session={activeSession}>
      <div className="app-shell">
        <aside className="sidebar">
          <div>
            <p className="eyebrow">Mis finanzas</p>
            <strong className="brand">Control</strong>
          </div>
          <nav>
            {navigation.map(([key, label]) => (
              <button
                className={view === key ? "nav-item active" : "nav-item"}
                aria-current={view === key ? "page" : undefined}
                key={key}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          <ErrorMessage error={logout.error} />
          <button className="link-button sidebar-exit" onClick={() => logout.mutate()}>
            Cerrar sesión
          </button>
        </aside>
        <main className="content">
          <div className="mobile-top">
            <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
              ☰
            </button>
            <strong>Control</strong>
            <button className="link-button" onClick={() => logout.mutate()}>
              Salir
            </button>
          </div>
          {menuOpen && (
            <div className="mobile-menu">
              <button
                className="mobile-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                ×
              </button>
              <nav>
                {navigation.map(([key, label]) => (
                  <button
                    className={view === key ? "nav-item active" : "nav-item"}
                    aria-current={view === key ? "page" : undefined}
                    key={key}
                    onClick={() => {
                      setView(key);
                      setMenuOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          )}
          <ErrorBoundary key={view}>
            <Suspense fallback={<LoadingSpinner />}>{views[view]}</Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </SessionProvider>
  );
}
