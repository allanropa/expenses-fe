import { api } from "../api";
import type { Account, AccountMovement } from "../types";

type Id = number | string;

export type NewAccount = {
  name: string;
  currency: string;
  account_type: string;
  opening_balance: string;
  opening_balance_date: string;
  description?: string | null;
};

export type BalanceAdjustment = {
  target_balance: string;
  adjustment_date: string;
  description: string;
};

export type AccountProfile = {
  name: string;
  description: string | null;
};

export const accountsApi = {
  list: (archived = false) =>
    api<Account[]>(archived ? "/api/accounts?archived=true" : "/api/accounts"),
  get: (id: Id) => api<Account>(`/api/accounts/${id}`),
  movements: (id: Id, params?: { limit?: number; offset?: number }) =>
    api<AccountMovement[]>(
      `/api/accounts/${id}/movements${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`,
    ),
  create: (csrf: string, body: NewAccount) =>
    api("/api/accounts", { method: "POST", csrf, body: JSON.stringify(body) }),
  updateProfile: (csrf: string, id: Id, body: AccountProfile) =>
    api(`/api/accounts/${id}`, { method: "PATCH", csrf, body: JSON.stringify(body) }),
  adjustBalance: (csrf: string, id: Id, body: BalanceAdjustment) =>
    api(`/api/accounts/${id}/balance-adjustments`, {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  archive: (csrf: string, id: Id) => api(`/api/accounts/${id}/archive`, { method: "POST", csrf }),
  unarchive: (csrf: string, id: Id) =>
    api(`/api/accounts/${id}/unarchive`, { method: "POST", csrf }),
};
