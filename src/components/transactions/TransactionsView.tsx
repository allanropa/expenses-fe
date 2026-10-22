import { FormEvent, useState } from "react";
import { money } from "../../utils/formatters";
import { sumByCurrency } from "../../utils/amounts";
import { toISODateString } from "../../utils/formatters";
import { ActionMenu, ErrorMessage, Modal, PaginationControls } from "../common";
import { useModal } from "../../hooks";
import type { Transaction } from "../../types";
import {
  useAccounts,
  useAddCardPurchase,
  useCards,
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
} from "../../queries";

type FormState = {
  kind: string;
  transaction_type: string;
  amount: string;
  currency: string;
  transaction_date: string;
  account_id: string;
  card_id: string;
  category_id: string;
  installments_count: string;
  description: string;
};

export function TransactionsView() {
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const transactions = useTransactions({ limit: pageSize, offset: page * pageSize });
  const accounts = useAccounts();
  const cards = useCards();
  const categories = useCategories();
  const createTransaction = useCreateTransaction();
  const addPurchase = useAddCardPurchase();
  const removeTransaction = useDeleteTransaction();

  const accountList = accounts.data ?? [];
  const cardList = cards.data ?? [];
  const categoryList = categories.data ?? [];
  const list = transactions.data ?? [];
  const addModal = useModal();
  const detailModal = useModal();
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const detailTransaction = list.find((item) => `${item.entry_type}-${item.id}` === detailKey);

  function sourceName(item: Transaction): string | null {
    if (item.card_id !== null) {
      return cardList.find((c) => c.id === item.card_id)?.name ?? `Tarjeta #${item.card_id}`;
    }
    if (item.account_id !== null) {
      return (
        accountList.find((a) => a.id === item.account_id)?.name ?? `Cuenta #${item.account_id}`
      );
    }
    return null;
  }

  function destinationName(item: Transaction): string | null {
    if (item.entry_type !== "transfer" || item.destination_account_id == null) return null;
    return (
      accountList.find((account) => account.id === item.destination_account_id)?.name ??
      `Cuenta #${item.destination_account_id}`
    );
  }

  const defaults: FormState = {
    kind: "debit",
    transaction_type: "expense",
    amount: "",
    currency: accountList[0]?.currency ?? "COP",
    transaction_date: toISODateString(),
    account_id: accountList[0] ? String(accountList[0].id) : "",
    card_id: cardList[0] ? String(cardList[0].id) : "",
    category_id: (() => {
      const expenseCategory = categoryList.find((c) => c.kind !== "income");
      return expenseCategory ? String(expenseCategory.id) : "";
    })(),
    installments_count: "1",
    description: "",
  };
  const [draft, setDraft] = useState<FormState | null>(null);
  const form = draft ?? defaults;
  const setForm = (next: FormState) => setDraft(next);

  function submit(event: FormEvent) {
    event.preventDefault();
    const onSuccess = () => {
      setDraft({ ...form, amount: "", description: "" });
      addModal.closeModal();
    };

    if (form.kind === "credit") {
      addPurchase.mutate(
        {
          id: form.card_id,
          body: {
            card_id: Number(form.card_id),
            category_id: Number(form.category_id),
            amount: form.amount,
            currency: form.currency,
            purchase_date: form.transaction_date,
            installments_count: Number(form.installments_count),
            description: form.description,
          },
        },
        { onSuccess },
      );
    } else {
      createTransaction.mutate(
        {
          transaction_type: form.transaction_type,
          amount: form.amount,
          currency: form.currency,
          transaction_date: form.transaction_date,
          account_id: Number(form.account_id),
          category_id: Number(form.category_id),
          description: form.description,
        },
        { onSuccess },
      );
    }
  }

  const selectedCard = cardList.find((c) => c.id === Number(form.card_id));
  const cardCurrencies = selectedCard?.currencies.map((item) => item.currency) ?? [];

  const totals = sumByCurrency(
    list.filter((item) => item.transaction_type === "expense"),
    (item) => item.currency,
    (item) => item.amount,
  );

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Movimientos</p>
          <h2>Transacciones</h2>
        </div>
        <button onClick={addModal.openModal}>Agregar movimiento</button>
      </header>

      <section className="summary-strip">
        <strong>{list.length} movimientos</strong>
        {Object.entries(totals).map(([currency, amount]) => (
          <span key={currency}>
            Gastos {currency}: {money(amount, currency)}
          </span>
        ))}
      </section>

      <div className="split-grid">
        <Modal
          open={addModal.open}
          title="Agregar movimiento"
          onClose={() => addModal.closeModal()}
        >
          <ErrorMessage
            error={
              createTransaction.error ??
              addPurchase.error ??
              accounts.error ??
              cards.error ??
              categories.error
            }
          />
          <form className="stack" onSubmit={submit}>
            <label>
              Medio
              <select
                value={form.kind}
                onChange={(event) => {
                  const kind = event.target.value;
                  setForm({
                    ...form,
                    kind: kind,
                    currency:
                      kind === "credit"
                        ? (selectedCard?.currencies[0]?.currency ?? form.currency)
                        : (accountList.find((a) => a.id === Number(form.account_id))?.currency ??
                          form.currency),
                    transaction_type: kind === "credit" ? "expense" : form.transaction_type,
                  });
                }}
              >
                <option value="debit">Débito / cuenta</option>
                <option value="credit">Crédito / tarjeta</option>
              </select>
            </label>

            {form.kind === "debit" ? (
              <>
                <label>
                  Tipo
                  <select
                    value={form.transaction_type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        transaction_type: event.target.value,
                      })
                    }
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>
                </label>
                <label>
                  Cuenta
                  <select
                    required
                    value={form.account_id}
                    onChange={(event) => {
                      const account = accountList.find((a) => a.id === Number(event.target.value));
                      setForm({
                        ...form,
                        account_id: event.target.value,
                        currency: account?.currency ?? form.currency,
                      });
                    }}
                  >
                    {accountList.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>
                  Tarjeta
                  <select
                    required
                    value={form.card_id}
                    onChange={(event) => {
                      const card = cardList.find((c) => c.id === Number(event.target.value));
                      setForm({
                        ...form,
                        card_id: event.target.value,
                        currency: card?.currencies[0]?.currency ?? form.currency,
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
                    value={form.currency}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        currency: event.target.value,
                      })
                    }
                  >
                    {cardCurrencies.map((currency) => (
                      <option key={currency}>{currency}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Cuotas
                  <input
                    type="number"
                    min="1"
                    value={form.installments_count}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        installments_count: event.target.value,
                      })
                    }
                  />
                </label>
              </>
            )}

            <label>
              Monto
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
              />
            </label>

            <label>
              Categoría
              <select
                required
                value={form.category_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category_id: event.target.value,
                  })
                }
              >
                {categoryList.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha
              <input
                required
                type="date"
                value={form.transaction_date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    transaction_date: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Descripción
              <input
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
              />
            </label>

            <button>Guardar movimiento</button>
          </form>
        </Modal>

        <section className="card transaction-list-card">
          <h3>Movimientos recientes</h3>
          {transactions.isPending && !transactions.error ? (
            <p className="muted">Cargando movimientos...</p>
          ) : transactions.error ? (
            <ErrorMessage error={transactions.error} />
          ) : list.length === 0 ? (
            <p className="muted">No hay movimientos registrados.</p>
          ) : (
            list.map((item) => (
              <div className="list-item" key={item.id}>
                <div>
                  <strong>
                    {item.description ||
                      (item.transaction_type === "transfer"
                        ? "Transferencia"
                        : item.transaction_type)}
                    {item.entry_type === "transfer" && <span className="chip">Transferencia</span>}
                    {item.transaction_type === "payment" && <span className="chip">Pago</span>}
                  </strong>
                  <small>
                    {item.transaction_date} · {item.currency}
                    {sourceName(item) ? ` · ${sourceName(item)}` : ""}
                    {destinationName(item) ? ` → ${destinationName(item)}` : ""}
                  </small>
                </div>
                <b className={item.transaction_type === "income" ? "positive" : "negative"}>
                  {item.transaction_type === "income" ? "+" : "-"}
                  {money(item.amount, item.currency)}
                  {item.original_amount != null && item.original_currency && (
                    <small> ≈ {money(item.original_amount, item.original_currency)}</small>
                  )}
                </b>
                <ActionMenu
                  onDetails={() => {
                    setDetailKey(`${item.entry_type}-${item.id}`);
                    detailModal.openModal();
                  }}
                  onDelete={
                    item.entry_type === "transaction" && item.transaction_type !== "payment"
                      ? () => removeTransaction.mutate(item.id)
                      : undefined
                  }
                />
              </div>
            ))
          )}
          <PaginationControls
            page={page}
            pageSize={pageSize}
            itemCount={list.length}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPage(0);
              setPageSize(nextPageSize);
            }}
          />
        </section>
      </div>
      <Modal
        open={detailModal.open}
        title="Detalle del movimiento"
        onClose={() => detailModal.closeModal()}
      >
        {detailTransaction && (
          <TransactionDetails
            transaction={detailTransaction}
            accountName={
              detailTransaction.account_id === null
                ? null
                : (accountList.find((a) => a.id === detailTransaction.account_id)?.name ??
                  `Cuenta #${detailTransaction.account_id}`)
            }
            cardName={
              detailTransaction.card_id === null
                ? null
                : (cardList.find((c) => c.id === detailTransaction.card_id)?.name ??
                  `Tarjeta #${detailTransaction.card_id}`)
            }
            categoryName={
              detailTransaction.category_id === null
                ? null
                : (categoryList.find((c) => c.id === detailTransaction.category_id)?.name ??
                  `Categoría #${detailTransaction.category_id}`)
            }
            destinationName={destinationName(detailTransaction)}
          />
        )}
      </Modal>
    </>
  );
}

function TransactionDetails({
  transaction,
  accountName,
  cardName,
  categoryName,
  destinationName,
}: {
  transaction: Transaction;
  accountName: string | null;
  cardName: string | null;
  categoryName: string | null;
  destinationName: string | null;
}) {
  const typeLabel =
    (
      { expense: "Gasto", income: "Ingreso", payment: "Pago", transfer: "Transferencia" } as Record<
        string,
        string
      >
    )[transaction.transaction_type] ?? transaction.transaction_type;
  const methodLabel =
    transaction.entry_type === "transfer"
      ? "Transferencia entre cuentas"
      : transaction.payment_method === "credit"
        ? "Tarjeta"
        : "Cuenta";
  const source = cardName ?? accountName ?? "Sin cuenta ni tarjeta";
  return (
    <section className="detail-panel">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{typeLabel}</p>
          <h3>{transaction.description || typeLabel}</h3>
          <p className="muted">{transaction.transaction_date}</p>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <small>Monto</small>
          <strong>{money(transaction.amount, transaction.currency)}</strong>
        </div>
        {transaction.original_amount != null && transaction.original_currency && (
          <div>
            <small>Monto original</small>
            <strong>{money(transaction.original_amount, transaction.original_currency)}</strong>
          </div>
        )}
        <div>
          <small>Medio</small>
          <strong>{methodLabel}</strong>
        </div>
        <div>
          <small>Fuente</small>
          <strong>
            {source}
            {destinationName ? ` → ${destinationName}` : ""}
          </strong>
        </div>
      </div>
      <h4>Relacionado con</h4>
      <div className="row">
        <span>{transaction.entry_type === "transfer" ? "Tipo" : "Categoría"}</span>
        <b>{categoryName ?? "Transferencia entre cuentas"}</b>
      </div>
      {transaction.notes && (
        <>
          <h4>Notas</h4>
          <p>{transaction.notes}</p>
        </>
      )}
    </section>
  );
}
