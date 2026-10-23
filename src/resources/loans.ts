import { api } from "../api";
import type { Loan } from "../types";

type Id = number | string;

export type NewLoan = {
  name: string;
  principal_amount: string;
  currency: string;
  annual_effective_rate: string;
  term_months: number;
  start_date: string;
  first_payment_date: string;
  source_account_id?: number;
  record_as_income: boolean;
};

export type LoanUpdate = {
  name?: string | null;
};

export type LoanPaymentInput = {
  source_account_id: number;
  payment_date: string;
  scheduled_amount: string;
  interest_paid?: string;
  extra_charges?: { amount: string; category_id?: number; description: string }[];
};

export type LoanExtraPrincipalInput = {
  source_account_id: number;
  payment_date: string;
  scheduled_amount?: string;
  extra_principal: string;
};

export const loansApi = {
  list: (params?: { limit?: number; offset?: number; archived?: boolean }) =>
    api<Loan[]>(
      `/api/loans?${new URLSearchParams({
        ...(params?.limit === undefined ? {} : { limit: String(params.limit) }),
        ...(params?.offset === undefined ? {} : { offset: String(params.offset) }),
        ...(params?.archived ? { archived: "true" } : {}),
      })}`,
    ),
  get: (id: Id) => api<Loan>(`/api/loans/${id}`),
  create: (csrf: string, body: NewLoan) =>
    api("/api/loans", { method: "POST", csrf, body: JSON.stringify(body) }),
  update: (csrf: string, id: Id, body: LoanUpdate) =>
    api(`/api/loans/${id}`, { method: "PATCH", csrf, body: JSON.stringify(body) }),
  close: (csrf: string, id: Id) => api(`/api/loans/${id}/close`, { method: "POST", csrf }),
  archive: (csrf: string, id: Id) => api(`/api/loans/${id}/archive`, { method: "POST", csrf }),
  recordPayment: (csrf: string, id: Id, body: LoanPaymentInput) =>
    api(`/api/loans/${id}/payments`, { method: "POST", csrf, body: JSON.stringify(body) }),
  recordExtraPrincipal: (csrf: string, id: Id, body: LoanExtraPrincipalInput) =>
    api(`/api/loans/${id}/payments`, { method: "POST", csrf, body: JSON.stringify(body) }),
};
