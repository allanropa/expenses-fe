import { api } from "../api";

export type Transfer = {
  id: number;
  source_account_id: number;
  destination_account_id: number;
  source_amount: string;
  source_currency: string;
  destination_amount: string;
  destination_currency: string;
  transfer_date: string;
  exchange_rate: string | null;
  description: string | null;
};

export type NewTransfer = {
  source_account_id: number;
  destination_account_id: number;
  source_amount: string;
  destination_amount?: string;
  transfer_date: string;
  exchange_rate?: string;
  description?: string;
};

export const transfersApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api<Transfer[]>(
      `/api/transfers${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ""}`,
    ),
  create: (csrf: string, body: NewTransfer) =>
    api<Transfer>(`/api/transfers`, {
      method: "POST",
      csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
};
