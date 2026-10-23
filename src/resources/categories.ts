import { api } from "../api";
import type { Category, CategoryKind } from "../types";

export type NewCategory = { name: string; kind: CategoryKind };

export const categoriesApi = {
  list: (archived = false) =>
    api<Category[]>(archived ? "/api/categories?archived=true" : "/api/categories"),
  create: (csrf: string, body: NewCategory) =>
    api<Category>("/api/categories", { method: "POST", csrf, body: JSON.stringify(body) }),
  remove: (csrf: string, id: number) => api(`/api/categories/${id}`, { method: "DELETE", csrf }),
  unarchive: (csrf: string, id: number) =>
    api(`/api/categories/${id}/unarchive`, { method: "POST", csrf }),
};
