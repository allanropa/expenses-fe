import { FormEvent, useState } from "react";
import type { Card } from "../../types";
import { money } from "../../utils/formatters";
import { toISODateString } from "../../utils/formatters";
import { isPositiveAmount, multiplyAmount, sumAmounts, sumByCurrency } from "../../utils/amounts";
import { ActionMenu, ErrorMessage, Modal } from "../common";
import { useModal } from "../../hooks";
import {
  useAccounts,
  useAdjustCardDebt,
  useArchiveCard,
  useCard,
  useCardPurchases,
  useCards,
  useCategories,
  useCreateCard,
  useRecordCardPayment,
  useSaveCardInterestRate,
} from "../../queries";

type PaymentLine = {
  kind: "capital" | "interes" | "gasto";
  amount: string;
  category_id: string;
  description: string;
};

function CardPaymentPanel({ cardId, onDone }: { cardId: number; onDone: () => void }) {
  const card = useCard(cardId);
  const accounts = useAccounts();
  const categories = useCategories();
  const recordPayment = useRecordCardPayment();
  const [currencyChoice, setCurrencyChoice] = useState<string | null>(null);
  const [lines, setLines] = useState<PaymentLine[]>([
    { kind: "capital", amount: "", category_id: "", description: "" },
  ]);
  const [source, setSource] = useState("");
  const [rate, setRate] = useState("");
  const [payDate, setPayDate] = useState(toISODateString());
  if (card.error) return <ErrorMessage error={card.error} />;
  if (!card.data) return <p className="muted">Cargando...</p>;
  const currency = currencyChoice ?? card.data.currencies[0]?.currency ?? "";
  function addLine() {
    setLines([...lines, { kind: "capital", amount: "", category_id: "", description: "" }]);
  }
  function updateLine(i: number, field: keyof PaymentLine, value: string) {
    const copy = [...lines];
    copy[i] = { ...copy[i], [field]: value };
    setLines(copy);
  }
  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }
  const capitalTotal = sumAmounts(lines.filter((l) => l.kind === "capital").map((l) => l.amount));
  const extraTotal = sumAmounts(lines.filter((l) => l.kind !== "capital").map((l) => l.amount));
  const expenseCategories = (categories.data ?? []).filter((c) => c.kind !== "income");
  const selectedAccount = (accounts.data ?? []).find((a) => a.id === Number(source));
  const isMultiCurrency = Boolean(selectedAccount && selectedAccount.currency !== currency);
  const sourceDecimals = selectedAccount?.currency === "COP" ? 0 : 2;
  const sourceAmount =
    isMultiCurrency && rate ? multiplyAmount(capitalTotal, rate, sourceDecimals) : "";
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!source || !isPositiveAmount(capitalTotal)) return;
    const extras = lines
      .filter((l) => l.kind !== "capital" && l.amount)
      .map((l) => ({
        amount: l.amount,
        category_id: Number(l.category_id) || expenseCategories[0]?.id,
        description: l.description || (l.kind === "interes" ? "Interés" : "Cargo adicional"),
      }));
    recordPayment.mutate(
      {
        id: cardId,
        body: {
          card_id: cardId,
          source_account_id: Number(source),
          obligation_amount: capitalTotal,
          obligation_currency: currency,
          source_amount: isMultiCurrency ? sourceAmount : undefined,
          exchange_rate: isMultiCurrency ? rate : undefined,
          payment_date: payDate,
          extra_charges: extras.length > 0 ? extras : undefined,
        },
      },
      { onSuccess: onDone },
    );
  }
  return (
    <div className="stack">
      <p className="muted">
        Pagando: <strong>{card.data.name}</strong> · Deuda {currency}:{" "}
        {money(
          card.data.currencies.find((c) => c.currency === currency)?.outstanding_debt ?? "0",
          currency,
        )}
      </p>
      <ErrorMessage error={recordPayment.error} />
      <form className="stack" onSubmit={submit}>
        <label>
          Moneda
          <select value={currency} onChange={(e) => setCurrencyChoice(e.target.value)}>
            {card.data.currencies.map((c) => (
              <option key={c.currency}>{c.currency}</option>
            ))}
          </select>
        </label>
        <label>
          Cuenta origen
          <select
            required
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setRate("");
            }}
          >
            <option value="">Seleccionar</option>
            {(accounts.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </label>
        {isMultiCurrency && (
          <label>
            Tasa de cambio ({currency} a {selectedAccount!.currency})
            <input
              required
              type="number"
              min="0"
              step="0.0001"
              placeholder="4000"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
        )}
        <label>
          Fecha
          <input
            required
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
        </label>
        <h4>Líneas de pago</h4>
        {lines.map((line, i) => (
          <div className="row line-row" key={i}>
            <select
              aria-label="Tipo de línea"
              value={line.kind}
              onChange={(e) => updateLine(i, "kind", e.target.value)}
              className="line-kind"
            >
              <option value="capital">Abono</option>
              <option value="interes">Interés</option>
              <option value="gasto">Gasto</option>
            </select>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              aria-label="Monto"
              placeholder="Monto"
              value={line.amount}
              onChange={(e) => updateLine(i, "amount", e.target.value)}
              className="line-amount"
            />
            {line.kind !== "capital" && (
              <select
                aria-label="Categoría"
                value={line.category_id}
                onChange={(e) => updateLine(i, "category_id", e.target.value)}
                className="line-category"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {line.kind !== "capital" && (
              <input
                aria-label="Descripción"
                placeholder="Descripción"
                value={line.description}
                onChange={(e) => updateLine(i, "description", e.target.value)}
                className="line-description"
              />
            )}
            <button type="button" onClick={() => removeLine(i)} className="line-remove">
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addLine}>
          + Agregar línea
        </button>
        {isPositiveAmount(capitalTotal) && (
          <p>
            <strong>Total abono: {money(capitalTotal, currency)}</strong>
          </p>
        )}
        {isPositiveAmount(extraTotal) && (
          <p>
            <strong>Cargos adicionales: {money(extraTotal, currency)}</strong>
          </p>
        )}
        {isMultiCurrency && rate && (
          <p>
            <strong>
              Total a descontar ({selectedAccount!.currency}):{" "}
              {money(
                multiplyAmount(sumAmounts([capitalTotal, extraTotal]), rate, sourceDecimals),
                selectedAccount!.currency,
              )}
            </strong>
          </p>
        )}
        {!isMultiCurrency && (isPositiveAmount(capitalTotal) || isPositiveAmount(extraTotal)) && (
          <p>
            <strong>
              Total a pagar: {money(sumAmounts([capitalTotal, extraTotal]), currency)}
            </strong>
          </p>
        )}
        <button disabled={!source || !isPositiveAmount(capitalTotal) || (isMultiCurrency && !rate)}>
          Registrar pago
        </button>
      </form>
    </div>
  );
}

function CardDetailsContent({ cardId }: { cardId: number }) {
  const card = useCard(cardId);
  const purchases = useCardPurchases(cardId);
  if (card.error) return <ErrorMessage error={card.error} />;
  if (!card.data) return <p className="muted">Cargando detalle...</p>;
  const purchaseList = purchases.data ?? [];
  const monthlyEstimate = sumAmounts(
    purchaseList.map((p) => (p.installments[0] ? p.installments[0].estimated_total : p.amount)),
  );
  return (
    <>
      <div className="detail-grid">
        {card.data.currencies.map((item) => (
          <div key={item.currency}>
            <small>Deuda {item.currency}</small>
            <strong>{money(item.outstanding_debt, item.currency)}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        Cuota estimada mensual: {money(monthlyEstimate, card.data.currencies[0]?.currency ?? "COP")}
      </p>
      <h4>Tasas mensuales</h4>
      {card.data.interest_rates.length === 0 ? (
        <p className="muted">No hay tasas configuradas.</p>
      ) : (
        card.data.interest_rates.map((rate) => (
          <div className="row" key={rate.id}>
            <span>
              {rate.currency ?? "Todas las monedas"}
              <small>
                {rate.effective_from}
                {rate.effective_to ? ` a ${rate.effective_to}` : " en adelante"}
              </small>
            </span>
            <b>{Number(rate.monthly_rate) * 100}%</b>
          </div>
        ))
      )}
      <h4>Compras recientes</h4>
      {purchases.error && <ErrorMessage error={purchases.error} />}
      {purchaseList.map((purchase) => (
        <div className="row" key={purchase.id}>
          <span>
            {purchase.description}
            <small>
              {purchase.installments_count} cuotas · {purchase.purchase_date} · tasa{" "}
              {Number(purchase.monthly_interest_rate) * 100}%
            </small>
          </span>
          <b>{money(purchase.amount, purchase.currency)}</b>
        </div>
      ))}
    </>
  );
}

function CardConfigurationPanel({
  cardId,
  onArchived,
}: {
  cardId: number;
  onArchived: () => void;
}) {
  const card = useCard(cardId);
  if (card.error) return <ErrorMessage error={card.error} />;
  if (!card.data) return <p className="muted">Cargando configuración...</p>;
  return <CardConfigurationForm key={card.data.id} card={card.data} onArchived={onArchived} />;
}

function CardConfigurationForm({ card, onArchived }: { card: Card; onArchived: () => void }) {
  const saveRate = useSaveCardInterestRate();
  const adjustDebt = useAdjustCardDebt();
  const archive = useArchiveCard();
  const initialCurrency = card.currencies[0]?.currency ?? "COP";
  const initialRate = card.interest_rates.find(
    (r) => r.currency === initialCurrency || r.currency === null,
  );
  const [currency, setCurrency] = useState(initialCurrency);
  const [monthlyRate, setMonthlyRate] = useState(
    initialRate ? String(Number(initialRate.monthly_rate) * 100) : "",
  );
  const [effectiveFrom, setEffectiveFrom] = useState(toISODateString());
  const [effectiveTo, setEffectiveTo] = useState("");
  const [targetDebt, setTargetDebt] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(toISODateString());
  const failure = saveRate.error ?? adjustDebt.error ?? archive.error;

  function submitRate(event: FormEvent) {
    event.preventDefault();
    saveRate.mutate(
      {
        id: card.id,
        body: {
          currency,
          monthly_rate: String(Number(monthlyRate) / 100),
          effective_from: effectiveFrom,
          effective_to: effectiveTo || null,
        },
      },
      { onSuccess: () => setMonthlyRate("") },
    );
  }

  function submitDebt(event: FormEvent) {
    event.preventDefault();
    adjustDebt.mutate(
      {
        id: card.id,
        body: {
          currency,
          target_debt: targetDebt,
          adjustment_date: adjustmentDate,
          description: "Ajuste manual de deuda",
        },
      },
      { onSuccess: () => setTargetDebt("") },
    );
  }

  return (
    <div className="stack">
      <p className="muted">
        Configurando: <strong>{card.name}</strong>
      </p>
      <ErrorMessage error={failure} />
      <form className="stack" onSubmit={submitRate}>
        <h4>Interés mensual</h4>
        <label>
          Moneda
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {card.currencies.map((c) => (
              <option key={c.currency}>{c.currency}</option>
            ))}
          </select>
        </label>
        <label>
          Tasa mensual (%)
          <input
            required
            type="number"
            min="0"
            step="0.00000001"
            placeholder="2.12345678"
            value={monthlyRate}
            onChange={(e) => setMonthlyRate(e.target.value)}
          />
        </label>
        <label>
          Vigente desde
          <input
            required
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </label>
        <label>
          Vigente hasta
          <input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
        </label>
        <button>Guardar tasa</button>
      </form>
      <form className="stack" onSubmit={submitDebt}>
        <h4>Ajustar deuda</h4>
        <label>
          Deuda objetivo
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={targetDebt}
            onChange={(e) => setTargetDebt(e.target.value)}
          />
        </label>
        <label>
          Fecha
          <input
            required
            type="date"
            value={adjustmentDate}
            onChange={(e) => setAdjustmentDate(e.target.value)}
          />
        </label>
        <button>Registrar ajuste</button>
      </form>
      <button
        type="button"
        className="danger-button"
        onClick={() => archive.mutate(card.id, { onSuccess: onArchived })}
      >
        Archivar tarjeta
      </button>
    </div>
  );
}

export function CardsView() {
  const cards = useCards();
  const createCard = useCreateCard();
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const payModal = useModal();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
  const [payId, setPayId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    issuing_bank: "",
    description: "",
    statement_closing_day: "15",
    currency: "COP",
    credit_limit: "",
  });

  const list = cards.data ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    createCard.mutate(
      {
        name: form.name,
        issuing_bank: form.issuing_bank || null,
        description: form.description || null,
        statement_closing_day: Number(form.statement_closing_day),
        currencies: [{ currency: form.currency, credit_limit: form.credit_limit || null }],
      },
      {
        onSuccess: () => {
          addModal.closeModal();
          setForm({ ...form, name: "" });
        },
      },
    );
  }

  const totals = sumByCurrency(
    list.flatMap((c) => c.currencies),
    (item) => item.currency,
    (item) => item.outstanding_debt,
  );

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Obligaciones</p>
          <h2>Tarjetas</h2>
        </div>
        <button
          onClick={() => {
            createCard.reset();
            addModal.openModal();
          }}
        >
          Agregar tarjeta
        </button>
      </header>
      <section className="summary-strip">
        <strong>{list.length} tarjetas</strong>
        {Object.entries(totals).map(([cur, amt]) => (
          <span key={cur}>
            Deuda {cur}: {money(amt, cur)}
          </span>
        ))}
      </section>
      <section className="card list-card">
        <ErrorMessage error={cards.error} />
        {cards.isPending && !cards.error ? (
          <p className="muted">Cargando tarjetas...</p>
        ) : list.length === 0 && !cards.error ? (
          <p className="muted">No hay tarjetas registradas.</p>
        ) : (
          list.map((card) => (
            <div className="list-item" key={card.id}>
              <div>
                <strong>{card.name}</strong>
                <small>
                  Corte día {card.statement_closing_day} ·{" "}
                  {card.currencies.map((c) => c.currency).join(" · ")}
                </small>
              </div>
              <b>{card.currencies.map((c) => money(c.outstanding_debt, c.currency)).join(" / ")}</b>
              <ActionMenu
                onDetails={() => {
                  setDetailId(card.id);
                  detailModal.openModal();
                }}
                onConfigure={() => {
                  setConfigId(card.id);
                  configModal.openModal();
                }}
                onPay={() => {
                  setPayId(card.id);
                  payModal.openModal();
                }}
              />
            </div>
          ))
        )}
      </section>
      <Modal open={addModal.open} title="Agregar tarjeta" onClose={() => addModal.closeModal()}>
        <form className="stack" onSubmit={submit}>
          <ErrorMessage error={createCard.error} />
          <label>
            Nombre
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Banco emisor
            <input
              value={form.issuing_bank}
              onChange={(e) => setForm({ ...form, issuing_bank: e.target.value })}
            />
          </label>
          <label>
            Descripción
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label>
            Día de corte
            <input
              required
              type="number"
              min="1"
              max="31"
              value={form.statement_closing_day}
              onChange={(e) => setForm({ ...form, statement_closing_day: e.target.value })}
            />
          </label>
          <label>
            Moneda
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option>COP</option>
              <option>USD</option>
            </select>
          </label>
          <label>
            Cupo de crédito
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
            />
          </label>
          <button>Guardar tarjeta</button>
        </form>
      </Modal>
      <Modal
        open={detailModal.open}
        title="Detalle de tarjeta"
        onClose={() => detailModal.closeModal()}
      >
        {detailId !== null && <CardDetailsContent cardId={detailId} />}
      </Modal>
      <Modal
        open={configModal.open}
        title="Configurar tarjeta"
        onClose={() => configModal.closeModal()}
      >
        {configId !== null && (
          <CardConfigurationPanel cardId={configId} onArchived={() => configModal.closeModal()} />
        )}
      </Modal>
      <Modal open={payModal.open} title="Pagar tarjeta" onClose={() => payModal.closeModal()}>
        {payId !== null && <CardPaymentPanel cardId={payId} onDone={() => payModal.closeModal()} />}
      </Modal>
    </>
  );
}
