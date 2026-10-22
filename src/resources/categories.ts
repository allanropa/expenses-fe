import { api } from "../api";
import type { Category } from "../types";

export type NewCategory = { name: string; kind: string };

export const categoriesApi = {
  list: () => api<Category[]>("/api/categories"),
  create: (csrf: string, body: NewCategory) =>
    api<Category>("/api/categories", { method: "POST", csrf, body: JSON.stringify(body) }),
  remove: (csrf: string, id: number) => api(`/api/categories/${id}`, { method: "DELETE", csrf }),
};
