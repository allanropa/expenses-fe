import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accountsApi,
  type AccountProfile,
  type BalanceAdjustment,
  type NewAccount,
} from "./resources/accounts";
import { authApi } from "./resources/auth";
import { budgetsApi, type BudgetInput } from "./resources/budgets";
import {
  cardsApi,
  type CardDebtAdjustment,
  type CardPayment,
  type InterestRateInput,
  type NewCard,
  type NewCardPurchase,
} from "./resources/cards";
import { categoriesApi, type NewCategory } from "./resources/categories";
import {
  loansApi,
  type LoanExtraPrincipalInput,
  type LoanPaymentInput,
  type LoanUpdate,
  type NewLoan,
} from "./resources/loans";
import type { Session } from "./types";
import { settingsApi, type UserSettings } from "./resources/settings";
import { transactionsApi, type NewTransaction } from "./resources/transactions";
import { transfersApi, type NewTransfer } from "./resources/transfers";
import { dashboardApi } from "./resources/dashboard";
import { useSession } from "./session";

type Id = number | string;
type MaybeId = Id | null | undefined;

const isSet = (id: MaybeId): id is Id => id !== null && id !== undefined && id !== "";

export const keys = {
  accounts: ["accounts"],
  cards: ["cards"],
  loans: ["loans"],
  budgets: ["budgets"],
  transactions: ["transactions"],
  categories: ["categories"],
  dashboard: ["dashboard"],
  settings: ["settings"],
  session: ["session"],
};

export function useAccounts() {
  return useQuery({ queryKey: keys.accounts, queryFn: () => accountsApi.list() });
}

export function useAccount(id: MaybeId) {
  return useQuery({
    queryKey: [...keys.accounts, id],
    queryFn: isSet(id) ? () => accountsApi.get(id) : skipToken,
  });
}

export function useAccountMovements(id: MaybeId, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...keys.accounts, id, "movements", params],
    queryFn: isSet(id) ? () => accountsApi.movements(id, params) : skipToken,
  });
}

export function useCards() {
  return useQuery({ queryKey: keys.cards, queryFn: () => cardsApi.list() });
}

export function useCard(id: MaybeId) {
  return useQuery({
    queryKey: [...keys.cards, id],
    queryFn: isSet(id) ? () => cardsApi.get(id) : skipToken,
  });
}

export function useCardPurchases(id: MaybeId, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...keys.cards, id, "purchases", params],
    queryFn: isSet(id) ? () => cardsApi.purchases(id, params) : skipToken,
  });
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: () => categoriesApi.list() });
}

export function useCreateCategory() {
  return useWrite((csrf, body: NewCategory) => categoriesApi.create(csrf, body), [keys.categories]);
}

export function useArchiveCategory() {
  return useWrite((csrf, id: number) => categoriesApi.remove(csrf, id), [keys.categories]);
}

export function useCreateTransfer() {
  return useWrite(
    (csrf, body: NewTransfer) => transfersApi.create(csrf, body),
    [keys.accounts, keys.dashboard],
  );
}

export function useLoans(params?: { limit?: number; offset?: number }) {
  return useQuery({ queryKey: [...keys.loans, params], queryFn: () => loansApi.list(params) });
}

export function useLoan(id: MaybeId) {
  return useQuery({
    queryKey: [...keys.loans, id],
    queryFn: isSet(id) ? () => loansApi.get(id) : skipToken,
  });
}

export function useBudgets() {
  return useQuery({ queryKey: keys.budgets, queryFn: () => budgetsApi.list() });
}

export function useBudget(id: MaybeId) {
  return useQuery({
    queryKey: [...keys.budgets, id],
    queryFn: isSet(id) ? () => budgetsApi.get(id) : skipToken,
  });
}

export function useBudgetSummary(id: MaybeId) {
  return useQuery({
    queryKey: [...keys.budgets, id, "summary"],
    queryFn: isSet(id) ? () => budgetsApi.summary(id) : skipToken,
  });
}

export function useTransactions(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...keys.transactions, params],
    queryFn: () => transactionsApi.list(params),
  });
}

export function useDashboard() {
  return useQuery({ queryKey: keys.dashboard, queryFn: () => dashboardApi.get() });
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: () => settingsApi.get() });
}

function useWrite<TVars>(
  write: (csrf: string, vars: TVars) => Promise<unknown>,
  invalidate: string[][],
) {
  const { csrf_token: csrf } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => write(csrf, vars),
    onSuccess: () =>
      Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export function useCreateAccount() {
  return useWrite(
    (csrf, body: NewAccount) => accountsApi.create(csrf, body),
    [keys.accounts, keys.dashboard],
  );
}

export function useUpdateAccountProfile() {
  return useWrite(
    (csrf, vars: { id: Id; body: AccountProfile }) =>
      accountsApi.updateProfile(csrf, vars.id, vars.body),
    [keys.accounts, keys.dashboard],
  );
}

export function useAdjustAccountBalance() {
  return useWrite(
    (csrf, vars: { id: Id; body: BalanceAdjustment }) =>
      accountsApi.adjustBalance(csrf, vars.id, vars.body),
    [keys.accounts, keys.dashboard],
  );
}

export function useArchiveAccount() {
  return useWrite((csrf, id: Id) => accountsApi.archive(csrf, id), [keys.accounts, keys.dashboard]);
}

export function useCreateCard() {
  return useWrite(
    (csrf, body: NewCard) => cardsApi.create(csrf, body),
    [keys.cards, keys.dashboard],
  );
}

export function useRecordCardPayment() {
  return useWrite(
    (csrf, vars: { id: Id; body: CardPayment }) => cardsApi.recordPayment(csrf, vars.id, vars.body),
    [keys.cards, keys.accounts, keys.dashboard],
  );
}

export function useSaveCardInterestRate() {
  return useWrite(
    (csrf, vars: { id: Id; body: InterestRateInput }) =>
      cardsApi.saveInterestRate(csrf, vars.id, vars.body),
    [keys.cards, keys.dashboard],
  );
}

export function useAdjustCardDebt() {
  return useWrite(
    (csrf, vars: { id: Id; body: CardDebtAdjustment }) =>
      cardsApi.adjustDebt(csrf, vars.id, vars.body),
    [keys.cards, keys.dashboard],
  );
}

export function useArchiveCard() {
  return useWrite((csrf, id: Id) => cardsApi.archive(csrf, id), [keys.cards, keys.dashboard]);
}

export function useAddCardPurchase() {
  return useWrite(
    (csrf, vars: { id: Id; body: NewCardPurchase }) =>
      cardsApi.addPurchase(csrf, vars.id, vars.body),
    [keys.cards, keys.transactions, keys.dashboard],
  );
}

export function useCreateLoan() {
  return useWrite(
    (csrf, body: NewLoan) => loansApi.create(csrf, body),
    [keys.loans, keys.dashboard],
  );
}

export function useUpdateLoan() {
  return useWrite(
    (csrf, vars: { id: Id; body: LoanUpdate }) => loansApi.update(csrf, vars.id, vars.body),
    [keys.loans, keys.dashboard],
  );
}

export function useArchiveLoan() {
  return useWrite((csrf, id: Id) => loansApi.archive(csrf, id), [keys.loans, keys.dashboard]);
}

export function useCloseLoan() {
  return useWrite(
    (csrf, id: Id) => loansApi.close(csrf, id),
    [keys.loans, keys.accounts, keys.transactions, keys.dashboard],
  );
}

export function useRecordLoanPayment() {
  return useWrite(
    (csrf, vars: { id: Id; body: LoanPaymentInput }) =>
      loansApi.recordPayment(csrf, vars.id, vars.body),
    [keys.loans, keys.accounts, keys.dashboard],
  );
}

export function useRecordLoanExtraPrincipal() {
  return useWrite(
    (csrf, vars: { id: Id; body: LoanExtraPrincipalInput }) =>
      loansApi.recordExtraPrincipal(csrf, vars.id, vars.body),
    [keys.loans, keys.accounts, keys.dashboard],
  );
}

export function useCreateBudget() {
  return useWrite(
    (csrf, body: BudgetInput) => budgetsApi.create(csrf, body),
    [keys.budgets, keys.dashboard],
  );
}

export function useUpdateBudget() {
  return useWrite(
    (csrf, vars: { id: Id; body: BudgetInput }) => budgetsApi.update(csrf, vars.id, vars.body),
    [keys.budgets, keys.dashboard],
  );
}

export function useArchiveBudget() {
  return useWrite((csrf, id: Id) => budgetsApi.archive(csrf, id), [keys.budgets, keys.dashboard]);
}

export function useCreateTransaction() {
  return useWrite(
    (csrf, body: NewTransaction) => transactionsApi.create(csrf, body),
    [keys.transactions, keys.accounts, keys.cards, keys.dashboard],
  );
}

export function useDeleteTransaction() {
  return useWrite(
    (csrf, id: number) => transactionsApi.remove(csrf, id),
    [keys.transactions, keys.accounts, keys.cards, keys.dashboard],
  );
}

export function useUpdateSettings() {
  return useWrite(
    (csrf, body: UserSettings) => settingsApi.update(csrf, body),
    [keys.settings, keys.dashboard],
  );
}

export function useUpdateProfile() {
  return useWrite(
    (csrf, body: { display_name: string }) => authApi.updateProfile(csrf, body),
    [keys.session],
  );
}

export function useSessionQuery() {
  return useQuery({
    queryKey: keys.session,
    queryFn: (): Promise<Session | null> => authApi.session(),
    retry: false,
  });
}

export function useLogout(csrf: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(csrf),
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== keys.session[0] });
      queryClient.setQueryData<Session | null>(keys.session, null);
    },
  });
}
