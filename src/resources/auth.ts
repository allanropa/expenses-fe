import { api } from "../api";
import type { Session } from "../types";

export const authApi = {
  session: () => api<Session>("/api/auth/session"),
  login: (body: Record<string, string>) =>
    api<Session>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body: Record<string, string>) =>
    api<Session>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  logout: (csrf: string) => api("/api/auth/logout", { method: "POST", csrf }),
  updateProfile: (csrf: string, body: { display_name: string }) =>
    api("/api/auth/profile", { method: "PATCH", csrf, body: JSON.stringify(body) }),
  changePassword: (csrf: string, body: { current_password: string; new_password: string }) =>
    api("/api/auth/password", { method: "POST", csrf, body: JSON.stringify(body) }),
};
