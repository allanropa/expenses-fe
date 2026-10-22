import { api } from "../api";
import type { Dashboard } from "../types";

export const dashboardApi = {
  get: (params?: { date_from?: string; date_to?: string }) =>
    api<Dashboard>(
      `/api/dashboard${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`,
    ),
};
