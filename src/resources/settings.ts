import { api } from "../api";

export type UserSettings = {
  reporting_currency: string;
  timezone: string;
};

export const settingsApi = {
  get: () => api<UserSettings>("/api/settings"),
  update: (csrf: string, body: UserSettings) =>
    api("/api/settings", { method: "PATCH", csrf, body: JSON.stringify(body) }),
};
