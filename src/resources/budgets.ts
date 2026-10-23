import { api } from "../api";
import type { Budget } from "../types";

type Id = number | string;

export type BudgetSummary = {
  budget_id: number;
  currency: string;
  period_start: string;
  period_end: string;
  accumulated_budget: string;
  actual_spending: string;
  balance: string;
  percentage_used: string;
  excess: string;
  equivalent_budget_days: string | null;
  daily_history: Record<string, unknown>[];
};

export type BudgetInput = {
  name: string;
  budget_type: string;
  target_amount: string;
  currency: string;
  period_type: string;
  scope: string;
  spending_type: string;
  category_id?: number | null;
  category_ids?: number[] | null;
  account_id?: number | null;
  account_ids?: number[] | null;
  card_id?: number | null;
  card_ids?: number[] | null;
  start_date?: string;
  end_date?: string;
  alert_threshold?: string;
};

export const budgetsApi = {
  list: (archived = false) =>
    api<Budget[]>(archived ? "/api/budgets?archived=true" : "/api/budgets"),
  get: (id: Id) => api<Budget>(`/api/budgets/${id}`),
  summary: (id: Id, params?: { date_from?: string; date_to?: string }) =>
    api<BudgetSummary>(
      `/api/budgets/${id}/summary${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`,
    ),
  create: (csrf: string, body: BudgetInput) =>
    api("/api/budgets", { method: "POST", csrf, body: JSON.stringify(body) }),
  update: (csrf: string, id: Id, body: BudgetInput) =>
    api(`/api/budgets/${id}`, { method: "PATCH", csrf, body: JSON.stringify(body) }),
  archive: (csrf: string, id: Id) => api(`/api/budgets/${id}/archive`, { method: "POST", csrf }),
  unarchive: (csrf: string, id: Id) =>
    api(`/api/budgets/${id}/unarchive`, { method: "POST", csrf }),
};
