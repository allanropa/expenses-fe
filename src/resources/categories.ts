import { api } from "../api";
import type { Category } from "../types";

export const categoriesApi = {
  list: () => api<Category[]>("/api/categories"),
};
