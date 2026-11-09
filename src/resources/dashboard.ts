import { api } from "../api";
import type { Dashboard } from "../types";

export type DashboardParams = {
  date_from?: string;
  date_to?: string;
  spending_method?: "debit" | "credit";
  spending_account_id?: string;
  spending_card_id?: string;
};

export const dashboardApi = {
  get: (params?: DashboardParams) =>
    api<Dashboard>(
      `/api/dashboard${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`,
    ),
};
