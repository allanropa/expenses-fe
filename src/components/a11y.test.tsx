// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../queryClient";
import { SessionProvider } from "../session";
import type { Session } from "../types";
import { AccountsView } from "./accounts/AccountsView";
import { BudgetsView } from "./budgets/BudgetsView";
import { CardsView } from "./cards/CardsView";
import { DashboardView } from "./dashboard/DashboardView";
import { LoansView } from "./loans/LoansView";
import { SettingsView } from "./settings/SettingsView";
import { TransactionsView } from "./transactions/TransactionsView";

const session: Session = {
  user: { id: 1, email: "ana@example.com", display_name: "Ana" },
  csrf_token: "tok",
};

const emptyDashboard = {
  period: { start: "2026-10-01", end: "2026-10-31" },
  income_by_currency: {},
  consumption_by_currency: {},
  difference_by_currency: {},
  accounts: [],
  card_debt: [],
  loan_debt: [],
  budgets: [],
  recent_transactions: [],
};

function responseFor(url: string): unknown {
  if (url.endsWith("/api/dashboard")) return emptyDashboard;
  if (url.endsWith("/api/settings"))
    return { reporting_currency: "COP", timezone: "America/Bogota" };
  return [];
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(responseFor(url)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderView(view: ReactNode) {
  return render(
    <QueryClientProvider client={createQueryClient(false)}>
      <SessionProvider session={session}>
        <main>{view}</main>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

async function expectNoAxeViolations() {
  const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.html),
    })),
  ).toEqual([]);
}

describe("views have no axe violations", () => {
  it.each([
    ["dashboard", <DashboardView />, "Tu posición financiera"],
    ["transactions", <TransactionsView />, "Transacciones"],
    ["accounts", <AccountsView />, "Cuentas"],
    ["cards", <CardsView />, "Tarjetas"],
    ["loans", <LoansView />, "Préstamos"],
    ["budgets", <BudgetsView />, "Presupuestos"],
    ["settings", <SettingsView />, "Configuración"],
  ])("%s", async (_name, view, heading) => {
    renderView(view);
    await screen.findByRole("heading", { level: 2, name: heading });
    await expectNoAxeViolations();
  });
});

describe("the axe check itself", () => {
  it("flags an unlabeled input", async () => {
    render(
      <main>
        <input type="text" />
      </main>,
    );
    const results = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations.map((violation) => violation.id)).toContain("label");
  });
});

describe("open add dialogs have no axe violations", () => {
  it.each([
    ["Agregar cuenta", <AccountsView />],
    ["Transferir", <AccountsView />],
    ["Agregar tarjeta", <CardsView />],
    ["Agregar préstamo", <LoansView />],
    ["Agregar presupuesto", <BudgetsView />],
  ])("%s", async (label, view) => {
    renderView(view);
    fireEvent.click(await screen.findByRole("button", { name: label }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await expectNoAxeViolations();
  });
});
