// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      <SessionProvider session={session}>{view}</SessionProvider>
    </QueryClientProvider>,
  );
}

describe("views render their heading", () => {
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
    expect(await screen.findByRole("heading", { level: 2, name: heading })).toBeTruthy();
  });
});

describe("add buttons open their dialog", () => {
  it.each([
    ["Agregar cuenta", <AccountsView />],
    ["Agregar tarjeta", <CardsView />],
    ["Agregar préstamo", <LoansView />],
    ["Agregar presupuesto", <BudgetsView />],
  ])("%s", async (label, view) => {
    renderView(view);
    fireEvent.click(await screen.findByRole("button", { name: label }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

describe("errors are shown to the user", () => {
  const jsonHeaders = { "Content-Type": "application/json" };

  it("shows the backend message when accounts fail to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "Base de datos no disponible" }), {
            status: 500,
            headers: jsonHeaders,
          }),
      ),
    );
    renderView(<AccountsView />);
    expect(await screen.findByText("Base de datos no disponible")).toBeTruthy();
  });

  it("shows the backend message inside the dialog when creating an account fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return new Response(JSON.stringify({ detail: "Nombre duplicado" }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        return new Response("[]", { status: 200, headers: jsonHeaders });
      }),
    );
    renderView(<AccountsView />);
    fireEvent.click(await screen.findByRole("button", { name: "Agregar cuenta" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Caja" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form") as HTMLFormElement);
    expect(await screen.findByText("Nombre duplicado")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

describe("transaction currency", () => {
  const jsonHeaders = { "Content-Type": "application/json" };
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders });
  const account = {
    id: 1,
    name: "Caja USD",
    account_type: "cash",
    currency: "USD",
    current_balance: "0",
    opening_balance: "0",
    opening_balance_date: "2026-10-01",
    description: null,
    is_archived: false,
  };
  const card = {
    id: 2,
    name: "Visa",
    issuing_bank: null,
    statement_closing_day: 15,
    description: null,
    is_archived: false,
    currencies: [
      { currency: "COP", credit_limit: null, outstanding_debt: "0", available_credit: null },
    ],
    interest_rates: [],
  };
  const category = { id: 3, name: "Comida", kind: "expense", is_archived: false };

  function mockApi() {
    const posted: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          posted.push({ url, body: JSON.parse(String(init.body)) });
          return json({});
        }
        if (url.endsWith("/api/accounts")) return json([account]);
        if (url.endsWith("/api/cards")) return json([card]);
        if (url.endsWith("/api/categories")) return json([category]);
        return json([]);
      }),
    );
    return posted;
  }

  it("uses the account currency for a debit entry, not the card currency", async () => {
    const posted = mockApi();
    renderView(<TransactionsView />);
    await screen.findByRole("option", { name: "Caja USD (USD)" });
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "10" } });
    fireEvent.submit(
      screen.getByRole("button", { name: "Guardar movimiento" }).closest("form") as HTMLFormElement,
    );
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toMatch(/\/api\/transactions$/);
    expect(posted[0].body.currency).toBe("USD");
    expect(posted[0].body.account_id).toBe(1);
  });

  it("uses the card currency when the entry is switched to credit", async () => {
    const posted = mockApi();
    renderView(<TransactionsView />);
    await screen.findByRole("option", { name: "Caja USD (USD)" });
    fireEvent.change(screen.getByLabelText("Medio"), { target: { value: "credit" } });
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "10" } });
    fireEvent.submit(
      screen.getByRole("button", { name: "Guardar movimiento" }).closest("form") as HTMLFormElement,
    );
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toMatch(/\/api\/cards\/2\/purchases$/);
    expect(posted[0].body.currency).toBe("COP");
  });
});

describe("transaction details", () => {
  const jsonHeaders = { "Content-Type": "application/json" };
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders });
  const account = {
    id: 1,
    name: "Caja USD",
    account_type: "cash",
    currency: "USD",
    current_balance: "0",
    opening_balance: "0",
    opening_balance_date: "2026-10-01",
    description: null,
    is_archived: false,
  };
  const category = { id: 3, name: "Comida", kind: "expense", is_archived: false };
  const expense = {
    id: 5,
    transaction_type: "expense",
    amount: "25.00",
    currency: "COP",
    original_amount: "6.00",
    original_currency: "USD",
    transaction_date: "2026-10-19",
    account_id: 1,
    card_id: null,
    credit_purchase_id: null,
    category_id: 3,
    payment_method: "debit",
    description: "Almuerzo",
    notes: "Con amigos",
    status: "posted",
  };
  const payment = {
    ...expense,
    id: 6,
    transaction_type: "payment",
    description: "Pago tarjeta",
    notes: null,
    original_amount: null,
    original_currency: null,
    account_id: 1,
  };

  function mockTransactions(transactions: unknown[]) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/api/transactions")) return json(transactions);
        if (url.endsWith("/api/accounts")) return json([account]);
        if (url.endsWith("/api/categories")) return json([category]);
        return json([]);
      }),
    );
  }

  it("shows the category, account, original amount, and notes of an expense", async () => {
    mockTransactions([expense]);
    renderView(<TransactionsView />);
    await screen.findByText("Almuerzo");
    fireEvent.click(screen.getByLabelText("Acciones"));
    fireEvent.click(screen.getByRole("button", { name: "Ver detalles" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Detalle del movimiento");
    expect(dialog.textContent).toContain("Comida");
    expect(dialog.textContent).toContain("Caja USD");
    expect(dialog.textContent).toContain("Monto original");
    expect(dialog.textContent).toContain("Con amigos");
  });

  it("offers details but not delete for a payment", async () => {
    mockTransactions([payment]);
    renderView(<TransactionsView />);
    await screen.findByText("Pago tarjeta");
    fireEvent.click(screen.getByLabelText("Acciones"));
    expect(screen.getByRole("button", { name: "Ver detalles" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Anular" })).toBeNull();
  });
});

describe("transaction source in details", () => {
  const jsonHeaders = { "Content-Type": "application/json" };
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders });
  const card = {
    id: 2,
    name: "Visa",
    issuing_bank: null,
    statement_closing_day: 15,
    description: null,
    is_archived: false,
    currencies: [
      { currency: "COP", credit_limit: null, outstanding_debt: "0", available_credit: null },
    ],
    interest_rates: [],
  };
  const base = {
    id: 7,
    transaction_type: "expense",
    amount: "40.00",
    currency: "COP",
    original_amount: null,
    original_currency: null,
    transaction_date: "2026-10-19",
    account_id: null,
    card_id: 2,
    credit_purchase_id: null,
    category_id: 3,
    payment_method: "credit",
    description: "Cena",
    notes: null,
    status: "posted",
  };

  function mockTransactions(transactions: unknown[]) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/api/transactions")) return json(transactions);
        if (url.endsWith("/api/cards")) return json([card]);
        if (url.endsWith("/api/categories"))
          return json([{ id: 3, name: "Comida", kind: "expense", is_archived: false }]);
        return json([]);
      }),
    );
  }

  async function openDetails(description: string) {
    renderView(<TransactionsView />);
    await screen.findByText(description);
    fireEvent.click(screen.getByLabelText("Acciones"));
    fireEvent.click(screen.getByRole("button", { name: "Ver detalles" }));
    return screen.getByRole("dialog");
  }

  it("shows the card of a credit transaction and no account row", async () => {
    mockTransactions([base]);
    const dialog = await openDetails("Cena");
    expect(dialog.textContent).toContain("Tarjeta");
    expect(dialog.textContent).toContain("Visa");
    expect(dialog.textContent).not.toContain("Cuenta");
  });

  it("shows the account ID when the account is not in the loaded list", async () => {
    mockTransactions([
      { ...base, account_id: 9, card_id: null, payment_method: "debit", description: "Taxi" },
    ]);
    const dialog = await openDetails("Taxi");
    expect(dialog.textContent).toContain("Cuenta #9");
  });
});

describe("transaction source in the list", () => {
  const jsonHeaders = { "Content-Type": "application/json" };
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: jsonHeaders });
  const card = {
    id: 2,
    name: "Visa",
    issuing_bank: null,
    statement_closing_day: 15,
    description: null,
    is_archived: false,
    currencies: [
      { currency: "COP", credit_limit: null, outstanding_debt: "0", available_credit: null },
    ],
    interest_rates: [],
  };
  const base = {
    id: 7,
    transaction_type: "expense",
    amount: "40.00",
    currency: "COP",
    original_amount: null,
    original_currency: null,
    transaction_date: "2026-10-19",
    account_id: null,
    card_id: 2,
    credit_purchase_id: null,
    category_id: 3,
    payment_method: "credit",
    description: "Cena",
    notes: null,
    status: "posted",
  };

  function mockTransactions(transactions: unknown[]) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/api/transactions")) return json(transactions);
        if (url.endsWith("/api/cards")) return json([card]);
        if (url.endsWith("/api/categories"))
          return json([{ id: 3, name: "Comida", kind: "expense", is_archived: false }]);
        return json([]);
      }),
    );
  }

  it("shows the card name next to the date and currency", async () => {
    mockTransactions([base]);
    renderView(<TransactionsView />);
    expect(await screen.findByText("2026-10-19 · COP · Visa")).toBeTruthy();
  });

  it("shows the account ID when the account is not in the loaded list", async () => {
    mockTransactions([
      { ...base, account_id: 9, card_id: null, payment_method: "debit", description: "Taxi" },
    ]);
    renderView(<TransactionsView />);
    expect(await screen.findByText("2026-10-19 · COP · Cuenta #9")).toBeTruthy();
  });
});
