import { api } from "../api";
import type { Card, CardPayment as CardPaymentRecord, Purchase } from "../types";

type Id = number | string;

export type NewCard = {
  name: string;
  issuing_bank?: string | null;
  description?: string | null;
  statement_closing_day: number;
  currencies: { currency: string; credit_limit: string | null }[];
};

export type CardPayment = {
  card_id: number;
  source_account_id: number | null;
  obligation_amount: string;
  obligation_currency: string;
  source_amount?: string | null;
  exchange_rate?: string | null;
  fee_amount?: string | null;
  payment_date: string;
  notes?: string | null;
  extra_charges?: { amount: string; category_id?: number; description: string }[];
};

export type InterestRateInput = {
  currency: string;
  monthly_rate: string;
  effective_from: string;
  effective_to: string | null;
};

export type CardDebtAdjustment = {
  currency: string;
  target_debt: string;
  adjustment_date: string;
  description?: string | null;
};

export type CardUpdate = {
  name?: string | null;
  issuing_bank?: string | null;
  statement_closing_day?: number | null;
  description?: string | null;
  credit_limits?: Record<string, string | null>;
};

export type CardCharge = {
  charge_type: "interest" | "fee" | "adjustment";
  amount: string;
  currency: string;
  charge_date: string;
  category_id: number;
  description: string;
};

export type CardChargeResponse = {
  id: number;
  amount: string;
  currency: string;
  charge_type: string;
};

export type NewCardPurchase = {
  card_id: number;
  category_id: number;
  amount: string;
  currency: string;
  purchase_date: string;
  installments_count: number;
  description: string;
};

export const cardsApi = {
  list: (archived = false) => api<Card[]>(archived ? "/api/cards?archived=true" : "/api/cards"),
  get: (id: Id) => api<Card>(`/api/cards/${id}`),
  purchases: (id: Id, params?: { limit?: number; offset?: number }) =>
    api<Purchase[]>(
      `/api/cards/${id}/purchases${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`,
    ),
  create: (csrf: string, body: NewCard) =>
    api("/api/cards", { method: "POST", csrf, body: JSON.stringify(body) }),
  update: (csrf: string, id: Id, body: CardUpdate) =>
    api(`/api/cards/${id}`, { method: "PATCH", csrf, body: JSON.stringify(body) }),
  addCharge: (csrf: string, id: Id, body: CardCharge) =>
    api<CardChargeResponse>(`/api/cards/${id}/charges`, {
      method: "POST",
      csrf,
      body: JSON.stringify(body),
    }),
  recordPayment: (csrf: string, id: Id, body: CardPayment) =>
    api(`/api/cards/${id}/payments`, {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  saveInterestRate: (csrf: string, id: Id, body: InterestRateInput) =>
    api(`/api/cards/${id}/interest-rates`, { method: "POST", csrf, body: JSON.stringify(body) }),
  adjustDebt: (csrf: string, id: Id, body: CardDebtAdjustment) =>
    api(`/api/cards/${id}/balance-adjustments`, {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  archive: (csrf: string, id: Id) => api(`/api/cards/${id}/archive`, { method: "POST", csrf }),
  unarchive: (csrf: string, id: Id) => api(`/api/cards/${id}/unarchive`, { method: "POST", csrf }),
  addPurchase: (csrf: string, id: Id, body: NewCardPurchase) =>
    api(`/api/cards/${id}/purchases`, {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  payments: (id: Id, params?: { limit?: number; offset?: number }) =>
    api<CardPaymentRecord[]>(
      `/api/cards/${id}/payments${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`,
    ),
  statement: (id: Id) => api<Record<string, unknown>>(`/api/cards/${id}/statement`),
};
