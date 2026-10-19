import { api } from "../api";
import type { Dashboard } from "../types";

export const dashboardApi = {
  get: () => api<Dashboard>("/api/dashboard"),
};
