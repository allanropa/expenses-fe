import { StrictMode, useEffect, useState, ReactNode, FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api";
import type { Session } from "./types";
import { Auth } from "./components/auth/Auth";
import { DashboardView } from "./components/dashboard/DashboardView";
import { AccountsView } from "./components/accounts/AccountsView";
import { TransactionsView } from "./components/transactions/TransactionsView";
import { SettingsView } from "./components/settings/SettingsView";
import { CardsView } from "./components/cards/CardsView";
import { LoansView } from "./components/loans/LoansView";
import { BudgetsView } from "./components/budgets/BudgetsView";
import "./styles.css";

type View = "dashboard" | "transactions" | "accounts" | "cards" | "loans" | "budgets" | "settings";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("dashboard");

  // Fixed: Proper error handling and only fetch on mount
  useEffect(() => {
    api<Session>("/api/auth/session")
      .then(setSession)
      .catch(() => {
        // User is not authenticated
      });
  }, []);

  if (!session) return <Auth onSession={setSession} />;

  const activeSession = session;

  const views: Record<View, ReactNode> = {
    dashboard: <DashboardView />,
    transactions: <TransactionsView csrf={activeSession.csrf_token} />,
    accounts: <AccountsView csrf={activeSession.csrf_token} />,
    cards: <CardsView csrf={activeSession.csrf_token} />,
    loans: <LoansView csrf={activeSession.csrf_token} />,
    budgets: <BudgetsView csrf={activeSession.csrf_token} />,
    settings: <SettingsView csrf={activeSession.csrf_token} user={activeSession.user} />,
  };

  async function logout() {
    await api("/api/auth/logout", {
      method: "POST",
      csrf: activeSession.csrf_token,
    });
    setSession(null);
  }

  const navigation: [View, string][] = [
    ["dashboard", "Resumen"],
    ["transactions", "Movimientos"],
    ["accounts", "Cuentas"],
    ["cards", "Tarjetas"],
    ["loans", "Préstamos"],
    ["budgets", "Presupuestos"],
    ["settings", "Configuración"],
  ];

  return (
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
              key={key}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="link-button sidebar-exit" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>
      <main className="content">
        <div className="mobile-top">
          <strong>Control</strong>
          <button className="link-button" onClick={logout}>
            Salir
          </button>
        </div>
        {views[view]}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
