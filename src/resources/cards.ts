import { api } from "../api";
import type { Card, Purchase } from "../types";

type Id = number | string;

export type NewCard = {
  name: string;
  issuing_bank: string | null;
  description: string | null;
  statement_closing_day: number;
  currencies: { currency: string; credit_limit: string | null }[];
};

export type CardPayment = {
  card_id: number;
  source_account_id: number;
  obligation_amount: string;
  obligation_currency: string;
  source_amount?: string;
  exchange_rate?: string;
  payment_date: string;
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
  description: string;
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
  list: () => api<Card[]>("/api/cards"),
  get: (id: Id) => api<Card>(`/api/cards/${id}`),
  purchases: (id: Id) => api<Purchase[]>(`/api/cards/${id}/purchases`),
  create: (csrf: string, body: NewCard) =>
    api("/api/cards", { method: "POST", csrf, body: JSON.stringify(body) }),
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
  addPurchase: (csrf: string, id: Id, body: NewCardPurchase) =>
    api(`/api/cards/${id}/purchases`, {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
};
