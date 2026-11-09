import { api } from "../api";
import type { RecurringPayment } from "../types";

export type RecurringFrequency = "weekly" | "monthly" | "yearly";
export type RecurringPaymentInput = {
  transaction_type: "income" | "expense";
  source_account_id?: number | null;
  destination_account_id?: number | null;
  card_id?: number | null;
  currency?: string | null;
  amount: string;
  category_id: number;
  description?: string | null;
  frequency: RecurringFrequency;
  weekday?: number | null;
  day_of_month?: number | null;
  month?: number | null;
  start_date: string;
  end_date?: string | null;
};

export type RecurringPaymentUpdate = RecurringPaymentInput & { is_active: boolean };

export const recurringApi = {
  list: (activeOnly = true) =>
    api<RecurringPayment[]>(`/api/recurring-payments?active_only=${String(activeOnly)}`),
  create: (csrf: string, body: RecurringPaymentInput) =>
    api<RecurringPayment>("/api/recurring-payments", {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
  update: (csrf: string, id: number, body: RecurringPaymentUpdate) =>
    api<RecurringPayment>(`/api/recurring-payments/${id}`, {
      method: "PATCH",
      csrf,
      body: JSON.stringify(body),
    }),
  deactivate: (csrf: string, id: number) =>
    api<RecurringPayment>(`/api/recurring-payments/${id}/deactivate`, {
      method: "POST",
      csrf,
    }),
};
