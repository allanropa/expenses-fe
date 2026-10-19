import { api } from "../api";
import type { Budget } from "../types";

type Id = number | string;

export type BudgetSummary = {
  period_start: string;
  period_end: string;
  accumulated_budget: string;
  actual_spending: string;
  balance: string;
  percentage_used: string;
  excess: string;
};

export type BudgetInput = Record<string, unknown>;

export const budgetsApi = {
  list: () => api<Budget[]>("/api/budgets"),
  get: (id: Id) => api<Budget>(`/api/budgets/${id}`),
  summary: (id: Id) => api<BudgetSummary>(`/api/budgets/${id}/summary`),
  create: (csrf: string, body: BudgetInput) =>
    api("/api/budgets", { method: "POST", csrf, body: JSON.stringify(body) }),
  update: (csrf: string, id: Id, body: BudgetInput) =>
    api(`/api/budgets/${id}`, { method: "PATCH", csrf, body: JSON.stringify(body) }),
  archive: (csrf: string, id: Id) => api(`/api/budgets/${id}/archive`, { method: "POST", csrf }),
};
