import { api } from "../api";
import type { Transaction } from "../types";

export type NewTransaction = {
  transaction_type: string;
  amount: string;
  currency: string;
  transaction_date: string;
  account_id: number;
  category_id: number;
  description: string;
};

export const transactionsApi = {
  list: () => api<Transaction[]>("/api/transactions"),
  create: (csrf: string, body: NewTransaction) =>
    api("/api/transactions", {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  remove: (csrf: string, id: number) => api(`/api/transactions/${id}`, { method: "DELETE", csrf }),
};
