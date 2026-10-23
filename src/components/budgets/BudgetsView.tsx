import { FormEvent, useState } from "react";
import type { Budget } from "../../types";
import type { BudgetInput } from "../../resources/budgets";
import { money } from "../../utils/formatters";
import { isPositiveAmount, sumByCurrency } from "../../utils/amounts";
import { toISODateString } from "../../utils/formatters";
import { ActionMenu, ErrorMessage, Modal } from "../common";
import { useModal } from "../../hooks";
import {
  useAccounts,
  useArchiveBudget,
  useBudget,
  useBudgetSummary,
  useBudgets,
  useCards,
  useCreateBudget,
  useUpdateBudget,
  useUnarchiveBudget,
} from "../../queries";

function BudgetDetailsContent({ initialId }: { initialId: string }) {
  const budget = useBudget(initialId);
  const summary = useBudgetSummary(initialId);
  if (budget.error) return <ErrorMessage error={budget.error} />;
  if (!budget.data) return <p className="muted">Cargando...</p>;
  const detail = budget.data;
  const periodLabel = (t: string) =>
    ({ daily: "Diario", weekly: "Semanal", monthly: "Mensual", custom: "Personalizado" })[t] ?? t;
  const current = summary.data;
  return (
    <section className="card detail-panel">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Detalle</p>
          <h3>{detail.name}</h3>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <small>Tipo</small>
          <strong>
            {detail.budget_type === "daily" ? "Acumulativo diario" : "Máximo"} ·{" "}
            {periodLabel(detail.period_type)}
          </strong>
        </div>
        <div>
          <small>Alcance</small>
          <strong>
            {detail.scope === "general"
              ? "General"
              : detail.scope === "account"
                ? "Cuenta"
                : "Tarjeta"}{" "}
            · {detail.spending_type === "debit" ? "Débito" : "Crédito"}
          </strong>
        </div>
        <div>
          <small>Moneda</small>
          <strong>{detail.currency}</strong>
        </div>
        <div>
          <small>Monto objetivo</small>
          <strong>{money(detail.target_amount, detail.currency)}</strong>
        </div>
      </div>
      {summary.error && <ErrorMessage error={summary.error} />}
      {current && (
        <>
          <div className="detail-grid mt-2">
            <div>
              <small>Período</small>
              <strong>
                {current.period_start} a {current.period_end}
              </strong>
            </div>
            <div>
              <small>Acumulado</small>
              <strong>{current.accumulated_budget}</strong>
            </div>
            <div>
              <small>Gastado</small>
              <strong>{current.actual_spending}</strong>
            </div>
            <div>
              <small>Saldo</small>
              <strong>{current.balance}</strong>
            </div>
          </div>
          <div className="mt-2">
            <div className="row">
              <span>Uso ({current.percentage_used}%)</span>
              <b>
                {isPositiveAmount(current.excess)
                  ? `Exceso: ${current.excess}`
                  : "Dentro del límite"}
              </b>
            </div>
            <div className="budget-progress">
              <div style={{ width: `${Math.min(Number(current.percentage_used), 200)}%` }} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function BudgetConfigurationPanel({
  initialId,
  onArchived,
}: {
  initialId: string;
  onArchived: () => void;
}) {
  const budget = useBudget(initialId);
  if (budget.error) return <ErrorMessage error={budget.error} />;
  if (!budget.data) return <p className="muted">Cargando...</p>;
  return (
    <BudgetConfigurationForm key={budget.data.id} budget={budget.data} onArchived={onArchived} />
  );
}

function BudgetConfigurationForm({
  budget,
  onArchived,
}: {
  budget: Budget;
  onArchived: () => void;
}) {
  const updateBudget = useUpdateBudget();
  const archive = useArchiveBudget();
  const accounts = useAccounts();
  const cards = useCards();
  const [name, setName] = useState(budget.name);
  const [budgetType, setBudgetType] = useState(budget.budget_type);
  const [targetAmount, setTargetAmount] = useState(budget.target_amount);
  const [periodType, setPeriodType] = useState(budget.period_type);
  const [scope, setScope] = useState(budget.scope);
  const [spendingType, setSpendingType] = useState(budget.spending_type);
  const [accountId, setAccountId] = useState(budget.account_id ? String(budget.account_id) : "");
  const [cardId, setCardId] = useState(budget.card_id ? String(budget.card_id) : "");
  const [startDate, setStartDate] = useState(budget.start_date);
  const [endDate, setEndDate] = useState(budget.end_date);
  const filteredAccounts = (accounts.data ?? []).filter((a) => a.currency === budget.currency);
  const filteredCards = (cards.data ?? []).filter((c) =>
    c.currencies.some((x) => x.currency === budget.currency),
  );
  const selectedAccountId =
    accountId || (filteredAccounts[0] ? String(filteredAccounts[0].id) : "");
  const selectedCardId = cardId || (filteredCards[0] ? String(filteredCards[0].id) : "");
  const scopeReady =
    scope === "account"
      ? selectedAccountId !== ""
      : scope === "card"
        ? selectedCardId !== ""
        : true;
  function save(event: FormEvent) {
    event.preventDefault();
    const body: BudgetInput = {
      name,
      budget_type: budgetType,
      target_amount: targetAmount,
      currency: budget.currency,
      period_type: periodType,
      scope,
      spending_type: spendingType,
    };
    if (scope === "account") {
      body.account_id = Number(selectedAccountId);
      body.spending_type = "debit";
    } else if (scope === "card") {
      body.card_id = Number(selectedCardId);
      body.spending_type = "credit";
    } else {
      body.spending_type = spendingType;
    }
    if (periodType === "custom") {
      body.start_date = startDate;
      body.end_date = endDate;
    }
    updateBudget.mutate({ id: budget.id, body });
  }
  return (
    <div className="stack">
      <p className="muted">
        Configurando: <strong>{budget.name}</strong>
      </p>
      <ErrorMessage error={updateBudget.error ?? archive.error} />
      <form className="stack" onSubmit={save}>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Tipo
          <select value={budgetType} onChange={(e) => setBudgetType(e.target.value)}>
            <option value="maximum">Máximo</option>
            <option value="daily">Acumulativo diario</option>
          </select>
        </label>
        <label>
          Monto objetivo
          <input
            required
            type="number"
            min="1"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
        </label>
        <label>
          Período
          <select value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            <option value="monthly">Mensual</option>
            <option value="weekly">Semanal</option>
            <option value="daily">Diario</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <label>
          Alcance
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="general">General</option>
            <option value="account">Cuenta</option>
            <option value="card">Tarjeta</option>
          </select>
        </label>
        {scope === "account" && (
          <label>
            Cuenta
            <select value={selectedAccountId} onChange={(e) => setAccountId(e.target.value)}>
              {filteredAccounts.length === 0 ? (
                <option value="">Sin cuentas en {budget.currency}</option>
              ) : (
                filteredAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))
              )}
            </select>
          </label>
        )}
        {scope === "card" && (
          <label>
            Tarjeta
            <select value={selectedCardId} onChange={(e) => setCardId(e.target.value)}>
              {filteredCards.length === 0 ? (
                <option value="">Sin tarjetas en {budget.currency}</option>
              ) : (
                filteredCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </label>
        )}
        {scope === "general" && (
          <label>
            Tipo de gasto
            <select value={spendingType} onChange={(e) => setSpendingType(e.target.value)}>
              <option value="debit">Débito</option>
              <option value="credit">Crédito</option>
            </select>
          </label>
        )}
        {periodType === "custom" && (
          <>
            <label>
              Desde
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </>
        )}
        <button disabled={!scopeReady}>Guardar cambios</button>
      </form>
      <button
        type="button"
        className="danger-button"
        onClick={() => archive.mutate(budget.id, { onSuccess: onArchived })}
      >
        Archivar presupuesto
      </button>
    </div>
  );
}

export function BudgetsView() {
  const [showArchived, setShowArchived] = useState(false);
  const budgets = useBudgets(showArchived);
  const accounts = useAccounts();
  const cards = useCards();
  const createBudget = useCreateBudget();
  const unarchive = useUnarchiveBudget();
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    budget_type: "maximum",
    target_amount: "",
    currency: "COP",
    period_type: "monthly",
    scope: "general",
    spending_type: "debit",
    category_id: "",
    account_id: "",
    card_id: "",
    start_date: toISODateString(),
    end_date: toISODateString(),
  });

  const list = budgets.data ?? [];
  const accountList = accounts.data ?? [];
  const cardList = cards.data ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    const body: BudgetInput = {
      name: form.name,
      budget_type: form.budget_type,
      target_amount: form.target_amount,
      currency: form.currency,
      period_type: form.period_type,
      scope: form.scope,
      spending_type: form.spending_type,
    };
    if (form.scope === "account") {
      if (!form.account_id) return;
      body.account_id = Number(form.account_id);
      body.spending_type = "debit";
    } else {
      body.account_id = null;
    }
    if (form.scope === "card") {
      if (!form.card_id) return;
      body.card_id = Number(form.card_id);
      body.spending_type = "credit";
    } else {
      body.card_id = null;
    }
    body.category_id = null;
    if (form.period_type !== "custom") {
      body.start_date = undefined;
      body.end_date = undefined;
    }
    createBudget.mutate(body, {
      onSuccess: () => {
        addModal.closeModal();
        setForm({ ...form, name: "", target_amount: "" });
      },
    });
  }

  const totals = sumByCurrency(
    list,
    (b) => b.currency,
    (b) => b.target_amount,
  );
  const periodLabel = (b: Budget) =>
    b.period_type !== "custom"
      ? ({ daily: "Diario", weekly: "Semanal", monthly: "Mensual" }[b.period_type] ?? b.period_type)
      : `${b.start_date} a ${b.end_date}`;
  const scopeLabel = (b: Budget) => {
    if (b.scope === "account") {
      const a = accountList.find((x) => x.id === b.account_id);
      return a ? a.name : "Cuenta";
    }
    if (b.scope === "card") {
      const c = cardList.find((x) => x.id === b.card_id);
      return c ? c.name : "Tarjeta";
    }
    return "General";
  };
  const filteredAccounts = accountList.filter((a) => a.currency === form.currency);
  const filteredCards = cardList.filter((c) =>
    c.currencies.some((x) => x.currency === form.currency),
  );

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Control flexible</p>
          <h2>Presupuestos</h2>
        </div>
        <button
          onClick={() => {
            createBudget.reset();
            addModal.openModal();
          }}
        >
          Agregar presupuesto
        </button>
      </header>
      <section className="summary-strip">
        <strong>{list.length} presupuestos</strong>
        {Object.entries(totals).map(([cur, amt]) => (
          <span key={cur}>
            Configurado {cur}: {money(amt, cur)}
          </span>
        ))}
      </section>
      <div className="list-tabs" aria-label="Presupuestos">
        <button
          type="button"
          className={!showArchived ? "active" : ""}
          onClick={() => setShowArchived(false)}
        >
          Activos
        </button>
        <button
          type="button"
          className={showArchived ? "active" : ""}
          onClick={() => setShowArchived(true)}
        >
          Archivados
        </button>
      </div>
      <section className="card list-card">
        <ErrorMessage error={budgets.error} />
        {budgets.isPending && !budgets.error ? (
          <p className="muted">Cargando presupuestos...</p>
        ) : list.length === 0 && !budgets.error ? (
          <p className="muted">No hay presupuestos registrados.</p>
        ) : (
          list.map((b) => (
            <div className="list-item" key={b.id}>
              <div>
                <strong>{b.name}</strong>
                <small>
                  {b.budget_type === "daily" ? "Diario" : "Máximo"} · {b.spending_type} ·{" "}
                  {periodLabel(b)} · {scopeLabel(b)}
                </small>
              </div>
              <b>{money(b.target_amount, b.currency)}</b>
              {showArchived ? (
                <button
                  type="button"
                  onClick={() => unarchive.mutate(b.id)}
                  disabled={unarchive.isPending}
                >
                  Desarchivar
                </button>
              ) : (
                <ActionMenu
                  onDetails={() => {
                    setDetailId(b.id);
                    detailModal.openModal();
                  }}
                  onConfigure={() => {
                    setConfigId(b.id);
                    configModal.openModal();
                  }}
                />
              )}
            </div>
          ))
        )}
      </section>
      <Modal open={addModal.open} title="Agregar presupuesto" onClose={() => addModal.closeModal()}>
        <form className="stack" onSubmit={submit}>
          <ErrorMessage error={createBudget.error} />
          <label>
            Nombre
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Tipo
            <select
              value={form.budget_type}
              onChange={(e) => setForm({ ...form, budget_type: e.target.value })}
            >
              <option value="maximum">Máximo</option>
              <option value="daily">Acumulativo diario</option>
            </select>
          </label>
          <label>
            Monto objetivo
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
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
            Período
            <select
              value={form.period_type}
              onChange={(e) => setForm({ ...form, period_type: e.target.value })}
            >
              <option value="monthly">Mensual</option>
              <option value="weekly">Semanal</option>
              <option value="daily">Diario</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <label>
            Alcance
            <select
              value={form.scope}
              onChange={(e) => {
                const s = e.target.value;
                const u: Record<string, string> = { scope: s, account_id: "", card_id: "" };
                if (s === "account" && filteredAccounts.length > 0)
                  u.account_id = String(filteredAccounts[0].id);
                if (s === "card" && filteredCards.length > 0)
                  u.card_id = String(filteredCards[0].id);
                setForm({ ...form, ...u });
              }}
            >
              <option value="general">General</option>
              <option value="account">Cuenta</option>
              <option value="card">Tarjeta</option>
            </select>
          </label>
          {form.scope === "account" && (
            <label>
              Cuenta
              <select
                value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              >
                {filteredAccounts.length === 0 ? (
                  <option value="">Sin cuentas en {form.currency}</option>
                ) : (
                  filteredAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          )}
          {form.scope === "card" && (
            <label>
              Tarjeta
              <select
                value={form.card_id}
                onChange={(e) => setForm({ ...form, card_id: e.target.value })}
              >
                {filteredCards.length === 0 ? (
                  <option value="">Sin tarjetas en {form.currency}</option>
                ) : (
                  filteredCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          )}
          {form.scope === "general" && (
            <label>
              Tipo de gasto
              <select
                value={form.spending_type}
                onChange={(e) => setForm({ ...form, spending_type: e.target.value })}
              >
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
              </select>
            </label>
          )}
          {form.period_type === "custom" && (
            <>
              <label>
                Desde
                <input
                  required
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </label>
              <label>
                Hasta
                <input
                  required
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </label>
            </>
          )}
          <button>Guardar presupuesto</button>
        </form>
      </Modal>
      <Modal
        open={detailModal.open}
        title="Detalle de presupuesto"
        onClose={() => detailModal.closeModal()}
      >
        {detailId !== null && <BudgetDetailsContent initialId={String(detailId)} />}
      </Modal>
      <Modal
        open={configModal.open}
        title="Configurar presupuesto"
        onClose={() => configModal.closeModal()}
      >
        {configId !== null && (
          <BudgetConfigurationPanel
            initialId={String(configId)}
            onArchived={() => configModal.closeModal()}
          />
        )}
      </Modal>
    </>
  );
}
