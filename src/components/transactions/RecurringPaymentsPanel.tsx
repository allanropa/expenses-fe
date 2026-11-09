import { FormEvent, useState } from "react";
import { useModal } from "../../hooks";
import {
  useAccounts,
  useCategories,
  useCards,
  useCreateRecurringPayment,
  useDeactivateRecurringPayment,
  useRecurringPayments,
  useUpdateRecurringPayment,
} from "../../queries";
import type { RecurringPayment } from "../../types";
import { money, toISODateString } from "../../utils/formatters";
import { ErrorMessage, Modal, MoneyInput } from "../common";
import type { RecurringPaymentInput } from "../../resources/recurring";

type FormState = RecurringPaymentInput;

const emptyForm = (accountId = ""): FormState => ({
  transaction_type: "expense",
  source_account_id: accountId ? Number(accountId) : null,
  destination_account_id: null,
  card_id: null,
  currency: null,
  amount: "",
  category_id: 0,
  description: "",
  frequency: "monthly",
  weekday: null,
  day_of_month: 1,
  month: 1,
  start_date: toISODateString(),
  end_date: null,
});

export function RecurringPaymentsPanel() {
  const accounts = useAccounts();
  const cards = useCards();
  const categories = useCategories();
  const recurring = useRecurringPayments();
  const create = useCreateRecurringPayment();
  const update = useUpdateRecurringPayment();
  const deactivate = useDeactivateRecurringPayment();
  const modal = useModal();
  const [editing, setEditing] = useState<RecurringPayment | null>(null);
  const [draft, setDraft] = useState<FormState | null>(null);
  const accountList = accounts.data ?? [];
  const cardList = cards.data ?? [];
  const categoryList = categories.data ?? [];
  const form = draft ?? emptyForm(accountList[0]?.id ? String(accountList[0].id) : "");
  const selectedAccountId =
    form.transaction_type === "expense" ? form.source_account_id : form.destination_account_id;
  const selectedAccount = accountList.find((item) => item.id === selectedAccountId);

  function openCreate() {
    setEditing(null);
    setDraft(emptyForm(accountList[0]?.id ? String(accountList[0].id) : ""));
    modal.openModal();
  }

  function openEdit(item: RecurringPayment) {
    setEditing(item);
    setDraft({
      transaction_type: item.transaction_type,
      source_account_id: item.source_account_id,
      destination_account_id: item.destination_account_id,
      card_id: item.card_id,
      currency: item.card_id ? item.currency : null,
      amount: item.amount,
      category_id: item.category_id,
      description: item.description,
      frequency: item.frequency,
      weekday: item.weekday,
      day_of_month: item.day_of_month,
      month: item.month,
      start_date: item.start_date,
      end_date: item.end_date,
    });
    modal.openModal();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = {
      ...form,
      amount: form.amount,
      category_id: Number(form.category_id),
      source_account_id:
        form.transaction_type === "expense" && !form.card_id ? form.source_account_id : null,
      destination_account_id:
        form.transaction_type === "income" ? form.destination_account_id : null,
    };
    if (editing) {
      update.mutate(
        { id: editing.id, body: { ...body, is_active: true } },
        { onSuccess: () => modal.closeModal() },
      );
    } else {
      create.mutate(body, { onSuccess: () => modal.closeModal() });
    }
  }

  function setType(transaction_type: "income" | "expense") {
    const account = accountList[0];
    setDraft({
      ...form,
      transaction_type,
      source_account_id: transaction_type === "expense" ? (account?.id ?? null) : null,
      destination_account_id: transaction_type === "income" ? (account?.id ?? null) : null,
      card_id: null,
      currency: null,
      category_id: 0,
    });
  }

  return (
    <section className="card transaction-list-card">
      <div className="section-heading">
        <div>
          <h3>Pagos recurrentes activos</h3>
          <p className="muted">Se generan automáticamente según su calendario.</p>
        </div>
        <button onClick={openCreate}>Agregar recurrente</button>
      </div>
      <ErrorMessage error={recurring.error ?? accounts.error ?? cards.error ?? categories.error} />
      {recurring.isPending ? (
        <p className="muted">Cargando pagos recurrentes...</p>
      ) : (recurring.data ?? []).length === 0 ? (
        <p className="muted">No hay pagos recurrentes activos.</p>
      ) : (
        (recurring.data ?? []).map((item) => {
          const accountId =
            item.transaction_type === "expense"
              ? item.source_account_id
              : item.destination_account_id;
          const account = accountList.find((entry) => entry.id === accountId);
          return (
            <div className="list-item" key={item.id}>
              <div>
                <strong>
                  {item.description ||
                    (item.transaction_type === "income"
                      ? "Ingreso recurrente"
                      : "Gasto recurrente")}
                </strong>
                <small>
                  {item.frequency} · {item.start_date} ·{" "}
                  {item.card_id
                    ? (cardList.find((card) => card.id === item.card_id)?.name ??
                      `Tarjeta #${item.card_id}`)
                    : (account?.name ?? "Cuenta")}
                </small>
              </div>
              <b>{money(item.amount, item.currency)}</b>
              <div className="row">
                <button className="link-button" onClick={() => openEdit(item)}>
                  Editar
                </button>
                <button className="link-button" onClick={() => deactivate.mutate(item.id)}>
                  Desactivar
                </button>
              </div>
            </div>
          );
        })
      )}
      <Modal
        open={modal.open}
        title={editing ? "Editar recurrente" : "Agregar recurrente"}
        onClose={modal.closeModal}
      >
        <ErrorMessage
          error={create.error ?? update.error ?? accounts.error ?? cards.error ?? categories.error}
        />
        <form className="stack" onSubmit={submit}>
          <label>
            Tipo
            <select
              value={form.transaction_type}
              onChange={(event) => setType(event.target.value as "income" | "expense")}
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </label>
          {form.transaction_type === "expense" && (
            <label>
              Medio de pago
              <select
                value={form.card_id ? "card" : "account"}
                onChange={(event) => {
                  const card = cardList[0];
                  setDraft(
                    event.target.value === "card"
                      ? {
                          ...form,
                          card_id: card?.id ?? null,
                          source_account_id: null,
                          currency: card?.currencies[0]?.currency ?? null,
                        }
                      : {
                          ...form,
                          card_id: null,
                          currency: null,
                          source_account_id: accountList[0]?.id ?? null,
                        },
                  );
                }}
              >
                <option value="account">Cuenta</option>
                <option value="card" disabled={cardList.length === 0}>
                  Tarjeta
                </option>
              </select>
            </label>
          )}
          {form.card_id ? (
            <>
              <label>
                Tarjeta
                <select
                  required
                  value={form.card_id}
                  onChange={(event) => {
                    const card = cardList.find((item) => item.id === Number(event.target.value));
                    setDraft({
                      ...form,
                      card_id: card?.id ?? null,
                      currency: card?.currencies[0]?.currency ?? null,
                    });
                  }}
                >
                  {cardList.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Moneda
                <select
                  required
                  value={form.currency ?? ""}
                  onChange={(event) => setDraft({ ...form, currency: event.target.value })}
                >
                  {(cardList.find((card) => card.id === form.card_id)?.currencies ?? []).map(
                    (item) => (
                      <option key={item.currency} value={item.currency}>
                        {item.currency}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </>
          ) : (
            <label>
              {form.transaction_type === "expense" ? "Cuenta de origen" : "Cuenta destino"}
              <select
                required
                value={String(selectedAccountId ?? "")}
                onChange={(event) =>
                  setDraft({
                    ...form,
                    ...(form.transaction_type === "expense"
                      ? { source_account_id: Number(event.target.value) }
                      : { destination_account_id: Number(event.target.value) }),
                  })
                }
              >
                {accountList.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Monto
            <MoneyInput
              required
              currency={
                form.card_id ? (form.currency ?? "COP") : (selectedAccount?.currency ?? "COP")
              }
              value={form.amount}
              onChange={(event) => setDraft({ ...form, amount: event.target.value })}
            />
          </label>
          <label>
            Categoría
            <select
              required
              value={form.category_id || ""}
              onChange={(event) => setDraft({ ...form, category_id: Number(event.target.value) })}
            >
              <option value="">Seleccionar categoría</option>
              {categoryList
                .filter(
                  (category) => category.kind === "both" || category.kind === form.transaction_type,
                )
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Frecuencia
            <select
              value={form.frequency}
              onChange={(event) =>
                setDraft({ ...form, frequency: event.target.value as FormState["frequency"] })
              }
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </label>
          {form.frequency === "weekly" && (
            <label>
              Día de la semana
              <select
                required
                value={form.weekday ?? ""}
                onChange={(event) => setDraft({ ...form, weekday: Number(event.target.value) })}
              >
                <option value="">Seleccionar día</option>
                {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(
                  (day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          {form.frequency !== "weekly" && (
            <label>
              Día del mes
              <input
                required
                type="number"
                min="1"
                max="31"
                value={form.day_of_month ?? ""}
                onChange={(event) =>
                  setDraft({ ...form, day_of_month: Number(event.target.value) })
                }
              />
            </label>
          )}
          {form.frequency === "yearly" && (
            <label>
              Mes
              <input
                required
                type="number"
                min="1"
                max="12"
                value={form.month ?? ""}
                onChange={(event) => setDraft({ ...form, month: Number(event.target.value) })}
              />
            </label>
          )}
          <label>
            Fecha de inicio
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(event) => setDraft({ ...form, start_date: event.target.value })}
            />
          </label>
          <label>
            Fecha final opcional
            <input
              type="date"
              value={form.end_date ?? ""}
              onChange={(event) => setDraft({ ...form, end_date: event.target.value || null })}
            />
          </label>
          <label>
            Descripción
            <input
              value={form.description ?? ""}
              onChange={(event) => setDraft({ ...form, description: event.target.value })}
            />
          </label>
          <button disabled={create.isPending || update.isPending}>Guardar recurrente</button>
        </form>
      </Modal>
    </section>
  );
}
