import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountsApi } from "./accounts";
import { authApi } from "./auth";
import { budgetsApi } from "./budgets";
import { cardsApi } from "./cards";
import { loansApi } from "./loans";
import { settingsApi } from "./settings";
import { transactionsApi } from "./transactions";

type Call = { url: string; init: RequestInit };

let calls: Call[];

beforeEach(() => {
  calls = [];
  vi.stubGlobal("window", { location: { hostname: "localhost", protocol: "http:" } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function only(): Call {
  expect(calls).toHaveLength(1);
  return calls[0];
}

function headers(call: Call): Headers {
  return new Headers(call.init.headers);
}

describe("resource modules send the same requests as the views did", () => {
  it("creates an account with the CSRF token and a JSON body", async () => {
    await accountsApi.create("tok", {
      name: "Caja",
      currency: "COP",
      account_type: "cash",
      opening_balance: "0",
      opening_balance_date: "2026-10-19",
    });
    const call = only();
    expect(call.url).toMatch(/\/api\/accounts$/);
    expect(call.init.method).toBe("POST");
    expect(headers(call).get("X-CSRF-Token")).toBe("tok");
    expect(headers(call).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(call.init.body as string).name).toBe("Caja");
  });

  it("updates an account profile with PATCH and a null description", async () => {
    await accountsApi.updateProfile("tok", 4, { name: "Caja", description: null });
    const call = only();
    expect(call.url).toMatch(/\/api\/accounts\/4$/);
    expect(call.init.method).toBe("PATCH");
    expect(JSON.parse(call.init.body as string)).toEqual({ name: "Caja", description: null });
  });

  it("sends an Idempotency-Key on balance adjustments", async () => {
    await accountsApi.adjustBalance("tok", 4, {
      target_balance: "100",
      adjustment_date: "2026-10-19",
      description: "",
    });
    expect(headers(only()).get("Idempotency-Key")).toBeTruthy();
  });

  it("records a card payment with an Idempotency-Key", async () => {
    await cardsApi.recordPayment("tok", 3, {
      card_id: 3,
      source_account_id: 1,
      obligation_amount: "10.00",
      obligation_currency: "COP",
      payment_date: "2026-10-19",
    });
    const call = only();
    expect(call.url).toMatch(/\/api\/cards\/3\/payments$/);
    expect(headers(call).get("Idempotency-Key")).toBeTruthy();
  });

  it("saves a card interest rate without an Idempotency-Key, as before", async () => {
    await cardsApi.saveInterestRate("tok", 3, {
      currency: "COP",
      monthly_rate: "0.02",
      effective_from: "2026-10-19",
      effective_to: null,
    });
    expect(headers(only()).has("Idempotency-Key")).toBe(false);
  });

  it("adds a card purchase with an Idempotency-Key", async () => {
    await cardsApi.addPurchase("tok", "3", {
      card_id: 3,
      category_id: 2,
      amount: "100",
      currency: "COP",
      purchase_date: "2026-10-19",
      installments_count: 1,
      description: "",
    });
    const call = only();
    expect(call.url).toMatch(/\/api\/cards\/3\/purchases$/);
    expect(headers(call).get("Idempotency-Key")).toBeTruthy();
  });

  it("uses the payments endpoint for extra principal and PATCH for loan updates", async () => {
    await loansApi.recordExtraPrincipal("tok", 5, {
      source_account_id: 1,
      payment_date: "2026-10-19",
      extra_principal: "0",
    });
    await loansApi.update("tok", 5, { name: "Moto" });
    expect(calls[0].url).toMatch(/\/api\/loans\/5\/payments$/);
    expect(calls[0].init.method).toBe("POST");
    expect(calls[1].url).toMatch(/\/api\/loans\/5$/);
    expect(calls[1].init.method).toBe("PATCH");
  });

  it("deletes a transaction with the CSRF token", async () => {
    await transactionsApi.remove("tok", 9);
    const call = only();
    expect(call.url).toMatch(/\/api\/transactions\/9$/);
    expect(call.init.method).toBe("DELETE");
    expect(headers(call).get("X-CSRF-Token")).toBe("tok");
  });

  it("reads budget summaries without a CSRF token", async () => {
    await budgetsApi.summary(2);
    const call = only();
    expect(call.url).toMatch(/\/api\/budgets\/2\/summary$/);
    expect(headers(call).has("X-CSRF-Token")).toBe(false);
  });

  it("logs in without a CSRF token and updates settings with PATCH", async () => {
    await authApi.login({ email: "a@b.co", password: "x" });
    await settingsApi.update("tok", { reporting_currency: "COP", timezone: "America/Bogota" });
    expect(calls[0].url).toMatch(/\/api\/auth\/login$/);
    expect(headers(calls[0]).has("X-CSRF-Token")).toBe(false);
    expect(calls[1].url).toMatch(/\/api\/settings$/);
    expect(calls[1].init.method).toBe("PATCH");
  });
});
