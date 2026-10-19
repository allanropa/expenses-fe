import { FormEvent, useEffect, useState } from "react";
import { api } from "../../api";
import type { Transaction, Account, Category, Card } from "../../types";
import { money } from "../../utils/formatters";
import { toISODateString } from "../../utils/formatters";
import { ActionMenu } from "../common";
import { useModal } from "../../hooks";

export function TransactionsView({ csrf }: { csrf: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const addModal = useModal();

  const [form, setForm] = useState({
    kind: "debit",
    transaction_type: "expense",
    amount: "",
    currency: "COP",
    transaction_date: toISODateString(),
    account_id: "",
    card_id: "",
    category_id: "",
    installments_count: "1",
    description: "",
  });

  const load = async () => {
    const [trans, accts, cds, cats] = await Promise.all([
      api<Transaction[]>("/api/transactions"),
      api<Account[]>("/api/accounts"),
      api<Card[]>("/api/cards"),
      api<Category[]>("/api/categories"),
    ]);

    setTransactions(trans);
    setAccounts(accts);
    setCards(cds);
    setCategories(cats);

    // Initialize form with first account/card/category if available
    if (accts[0]) {
      setForm((prev) => ({
        ...prev,
        account_id: String(accts[0].id),
        currency: accts[0].currency,
      }));
    }
    if (cds[0]) {
      setForm((prev) => ({
        ...prev,
        card_id: String(cds[0].id),
        currency: cds[0].currencies[0]?.currency ?? prev.currency,
      }));
    }
    const expenseCategory = cats.find((c) => c.kind !== "income");
    if (expenseCategory) {
      setForm((prev) => ({
        ...prev,
        category_id: String(expenseCategory.id),
      }));
    }
  };

  // Fixed: Load all data once on mount
  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (form.kind === "credit") {
      await api(`/api/cards/${form.card_id}/purchases`, {
        method: "POST",
        csrf,
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          card_id: Number(form.card_id),
          category_id: Number(form.category_id),
          amount: form.amount,
          currency: form.currency,
          purchase_date: form.transaction_date,
          installments_count: Number(form.installments_count),
          description: form.description,
        }),
      });
    } else {
      await api("/api/transactions", {
        method: "POST",
        csrf,
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          transaction_type: form.transaction_type,
          amount: form.amount,
          currency: form.currency,
          transaction_date: form.transaction_date,
          account_id: Number(form.account_id),
          category_id: Number(form.category_id),
          description: form.description,
        }),
      });
    }

    addModal.close_modal();
    setForm((prev) => ({ ...prev, amount: "", description: "" }));
    load();
  }

  async function remove(id: number) {
    await api(`/api/transactions/${id}`, {
      method: "DELETE",
      csrf,
    });
    load();
  }

  const selectedCard = cards.find((c) => c.id === Number(form.card_id));
  const cardCurrencies =
    selectedCard?.currencies.map((item) => item.currency) ?? [];

  const totals = transactions.reduce<Record<string, number>>(
    (result, item) => {
      if (item.transaction_type === "expense") {
        result[item.currency] =
          (result[item.currency] ?? 0) + Number(item.amount);
      }
      return result;
    },
    {}
  );

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Movimientos</p>
          <h2>Transacciones</h2>
        </div>
      </header>

      <section className="summary-strip">
        <strong>{transactions.length} movimientos</strong>
        {Object.entries(totals).map(([currency, amount]) => (
          <span key={currency}>
            Gastos {currency}: {money(amount, currency)}
          </span>
        ))}
      </section>

      <div className="split-grid">
        <section className="card">
          <h3>Agregar movimiento</h3>
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
                    transaction_type:
                      kind === "credit" ? "expense" : form.transaction_type,
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
                      const account = accounts.find(
                        (a) => a.id === Number(event.target.value)
                      );
                      setForm({
                        ...form,
                        account_id: event.target.value,
                        currency: account?.currency ?? form.currency,
                      });
                    }}
                  >
                    {accounts.map((account) => (
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
                      const card = cards.find(
                        (c) => c.id === Number(event.target.value)
                      );
                      setForm({
                        ...form,
                        card_id: event.target.value,
                        currency:
                          card?.currencies[0]?.currency ??
                          form.currency,
                      });
                    }}
                  >
                    {cards.map((card) => (
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
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
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
                {categories.map((category) => (
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
        </section>

        <section className="card">
          <h3>Movimientos recientes</h3>
          {transactions.length === 0 ? (
            <p className="muted">No hay movimientos registrados.</p>
          ) : (
            transactions.map((item) => (
              <div className="list-item" key={item.id}>
                <div>
                  <strong>
                    {item.description || item.transaction_type}
                    {item.transaction_type === "payment" && <span className="chip">Pago</span>}
                  </strong>
                  <small>
                    {item.transaction_date} · {item.currency}
                  </small>
                </div>
                <b
                  className={
                    item.transaction_type === "income"
                      ? "positive"
                      : "negative"
                  }
                >
                  {item.transaction_type === "income" ? "+" : "-"}
                  {money(item.amount, item.currency)}
                  {item.original_amount != null && item.original_currency && (
                    <small> ≈ {money(item.original_amount, item.original_currency)}</small>
                  )}
                </b>
                {item.transaction_type !== "payment" && (
                  <ActionMenu
                    onDetails={() => {}}
                    onDelete={() => remove(item.id)}
                  />
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
