import { api } from "../api";
import type { Transaction } from "../types";

export type NewTransaction = {
  transaction_type: string;
  amount: string;
  currency: string;
  transaction_date: string;
  account_id: number;
  category_id: number;
  description?: string | null;
  notes?: string | null;
};

export type TransactionUpdate = Partial<NewTransaction>;

export type TransactionListParams = {
  date_from?: string;
  date_to?: string;
  transaction_type?: string;
  account_id?: number;
  category_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
};

export const transactionsApi = {
  list: (params?: TransactionListParams) =>
    api<Transaction[]>(
      `/api/transactions${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`,
    ),
  create: (csrf: string, body: NewTransaction) =>
    api("/api/transactions", {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  remove: (csrf: string, id: number) => api(`/api/transactions/${id}`, { method: "DELETE", csrf }),
  update: (csrf: string, id: number, body: TransactionUpdate) =>
    api(`/api/transactions/${id}`, { method: "PATCH", csrf, body: JSON.stringify(body) }),
};
