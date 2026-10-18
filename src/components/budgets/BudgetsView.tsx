import { useEffect, useState, FormEvent } from "react";
import { api } from "../../api";
import type { Budget, Account, Card } from "../../types";
import { money } from "../../utils/formatters";
import { toISODateString } from "../../utils/formatters";
import { Modal, ActionMenu } from "../common";
import { useModal } from "../../hooks";

function BudgetDetailsContent({ initialId }: { initialId: string }) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => {
    api<Budget>(`/api/budgets/${initialId}`).then(setBudget).catch(() => undefined);
    api(`/api/budgets/${initialId}/summary`).then(setSummary).catch(() => undefined);
  }, [initialId]);
  if (!budget) return <p className="muted">Cargando...</p>;
  const periodLabel = (t: string) => ({ daily: "Diario", weekly: "Semanal", monthly: "Mensual", custom: "Personalizado" })[t] ?? t;
  return (
    <section className="card detail-panel">
      <div className="detail-heading"><div><p className="eyebrow">Detalle</p><h3>{budget.name}</h3></div></div>
      <div className="detail-grid">
        <div><small>Tipo</small><strong>{budget.budget_type === "daily" ? "Acumulativo diario" : "Máximo"} · {periodLabel(budget.period_type)}</strong></div>
        <div><small>Alcance</small><strong>{budget.scope === "general" ? "General" : budget.scope === "account" ? "Cuenta" : "Tarjeta"} · {budget.spending_type === "debit" ? "Débito" : "Crédito"}</strong></div>
        <div><small>Moneda</small><strong>{budget.currency}</strong></div>
        <div><small>Monto objetivo</small><strong>{money(budget.target_amount, budget.currency)}</strong></div>
      </div>
      {summary && (
        <>
          <div className="detail-grid" style={{ marginTop: 8 }}>
            <div><small>Período</small><strong>{summary.period_start} a {summary.period_end}</strong></div>
            <div><small>Acumulado</small><strong>{summary.accumulated_budget}</strong></div>
            <div><small>Gastado</small><strong>{summary.actual_spending}</strong></div>
            <div><small>Saldo</small><strong>{summary.balance}</strong></div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="row"><span>Uso ({summary.percentage_used}%)</span><b>{Number(summary.excess) <= 0 ? "Dentro del límite" : `Exceso: ${summary.excess}`}</b></div>
            <div className="budget-progress"><div style={{ width: `${Math.min(Number(summary.percentage_used), 200)}%` }} /></div>
          </div>
        </>
      )}
    </section>
  );
}

function BudgetConfigurationPanel({ csrf, initialId, onArchived }: { csrf: string; initialId: string; onArchived: () => void }) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [name, setName] = useState("");
  const [budgetType, setBudgetType] = useState("maximum");
  const [targetAmount, setTargetAmount] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [scope, setScope] = useState("general");
  const [spendingType, setSpendingType] = useState("debit");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  useEffect(() => {
    api<Budget>(`/api/budgets/${initialId}`).then(v => {
      setBudget(v);
      setName(v.name);
      setBudgetType(v.budget_type);
      setTargetAmount(v.target_amount);
      setPeriodType(v.period_type);
      setScope(v.scope);
      setSpendingType(v.spending_type);
      setStartDate(v.start_date);
      setEndDate(v.end_date);
    }).catch(() => undefined);
  }, [initialId]);
  async function save(event: FormEvent) {
    event.preventDefault();
    const body: Record<string, unknown> = { name, budget_type: budgetType, target_amount: targetAmount, period_type: periodType, scope, spending_type: spendingType };
    if (periodType === "custom") { body.start_date = startDate; body.end_date = endDate; }
    await api(`/api/budgets/${initialId}`, { method: "PATCH", csrf, body: JSON.stringify(body) });
  }
  async function archive() { await api(`/api/budgets/${initialId}/archive`, { method: "POST", csrf }); onArchived(); }
  if (!budget) return <p className="muted">Cargando...</p>;
  return (
    <div className="stack">
      <p className="muted">Configurando: <strong>{budget.name}</strong></p>
      <form className="stack" onSubmit={save}>
        <label>Nombre<input value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Tipo<select value={budgetType} onChange={e => setBudgetType(e.target.value)}><option value="maximum">Máximo</option><option value="daily">Acumulativo diario</option></select></label>
        <label>Monto objetivo<input required type="number" min="1" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} /></label>
        <label>Período<select value={periodType} onChange={e => setPeriodType(e.target.value)}><option value="monthly">Mensual</option><option value="weekly">Semanal</option><option value="daily">Diario</option><option value="custom">Personalizado</option></select></label>
        <label>Alcance<select value={scope} onChange={e => setScope(e.target.value)}><option value="general">General</option><option value="account">Cuenta</option><option value="card">Tarjeta</option></select></label>
        <label>Tipo de gasto<select value={spendingType} onChange={e => setSpendingType(e.target.value)}><option value="debit">Débito</option><option value="credit">Crédito</option></select></label>
        {periodType === "custom" && <><label>Desde<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label>Hasta<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label></>}
        <button>Guardar cambios</button>
      </form>
      <button type="button" className="danger-button" onClick={archive}>Archivar presupuesto</button>
    </div>
  );
}

export function BudgetsView({ csrf }: { csrf: string }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", budget_type: "maximum", target_amount: "", currency: "COP", period_type: "monthly",
    scope: "general", spending_type: "debit", category_id: "", account_id: "", card_id: "",
    start_date: toISODateString(), end_date: toISODateString(),
  });

  const load = () => api<Budget[]>("/api/budgets").then(setBudgets).catch(() => undefined);
  useEffect(() => {
    load();
    api<Account[]>("/api/accounts").then(setAccounts).catch(() => undefined);
    api<Card[]>("/api/cards").then(setCards).catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body: Record<string, unknown> = { ...form, target_amount: form.target_amount, scope: form.scope };
    if (form.scope === "account") {
      if (!form.account_id) return;
      body.account_id = Number(form.account_id);
      body.spending_type = "debit";
    } else { delete body.account_id; }
    if (form.scope === "card") {
      if (!form.card_id) return;
      body.card_id = Number(form.card_id);
      body.spending_type = "credit";
    } else { delete body.card_id; }
    delete body.category_id;
    if (form.period_type !== "custom") { delete body.start_date; delete body.end_date; }
    await api("/api/budgets", { method: "POST", csrf, body: JSON.stringify(body) });
    addModal.close_modal();
    setForm({ ...form, name: "", target_amount: "" });
    load();
  }

  const totals = budgets.reduce<Record<string, number>>((r, b) => { r[b.currency] = (r[b.currency] ?? 0) + Number(b.target_amount); return r; }, {});
  const periodLabel = (b: Budget) => b.period_type !== "custom" ? ({ daily: "Diario", weekly: "Semanal", monthly: "Mensual" })[b.period_type] ?? b.period_type : `${b.start_date} a ${b.end_date}`;
  const scopeLabel = (b: Budget) => {
    if (b.scope === "account") { const a = accounts.find(x => x.id === b.account_id); return a ? a.name : "Cuenta"; }
    if (b.scope === "card") { const c = cards.find(x => x.id === b.card_id); return c ? c.name : "Tarjeta"; }
    return "General";
  };
  const filteredAccounts = accounts.filter(a => a.currency === form.currency);
  const filteredCards = cards.filter(c => c.currencies.some(x => x.currency === form.currency));

  return (
    <>
      <header className="page-heading">
        <div><p className="eyebrow">Control flexible</p><h2>Presupuestos</h2></div>
        <button onClick={() => addModal.open_modal()}>Agregar presupuesto</button>
      </header>
      <section className="summary-strip">
        <strong>{budgets.length} presupuestos</strong>
        {Object.entries(totals).map(([cur, amt]) => <span key={cur}>Configurado {cur}: {money(amt, cur)}</span>)}
      </section>
      <section className="card list-card">
        {budgets.length === 0 ? <p className="muted">No hay presupuestos registrados.</p> : (
          budgets.map(b => (
            <div className="list-item" key={b.id}>
              <div><strong>{b.name}</strong><small>{b.budget_type === "daily" ? "Diario" : "Máximo"} · {b.spending_type} · {periodLabel(b)} · {scopeLabel(b)}</small></div>
              <b>{money(b.target_amount, b.currency)}</b>
              <ActionMenu
                onDetails={() => { setDetailId(b.id); detailModal.open_modal(); }}
                onConfigure={() => { setConfigId(b.id); configModal.open_modal(); }}
              />
            </div>
          ))
        )}
      </section>
      <Modal open={addModal.open} title="Agregar presupuesto" onClose={() => addModal.close_modal()}>
        <form className="stack" onSubmit={submit}>
          <label>Nombre<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Tipo<select value={form.budget_type} onChange={e => setForm({ ...form, budget_type: e.target.value })}><option value="maximum">Máximo</option><option value="daily">Acumulativo diario</option></select></label>
          <label>Monto objetivo<input required type="number" min="1" step="0.01" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} /></label>
          <label>Moneda<select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}><option>COP</option><option>USD</option></select></label>
          <label>Período<select value={form.period_type} onChange={e => setForm({ ...form, period_type: e.target.value })}><option value="monthly">Mensual</option><option value="weekly">Semanal</option><option value="daily">Diario</option><option value="custom">Personalizado</option></select></label>
          <label>Alcance<select value={form.scope} onChange={e => { const s = e.target.value; const u: Record<string, string> = { scope: s, account_id: "", card_id: "" }; if (s === "account" && filteredAccounts.length > 0) u.account_id = String(filteredAccounts[0].id); if (s === "card" && filteredCards.length > 0) u.card_id = String(filteredCards[0].id); setForm({ ...form, ...u }); }}><option value="general">General</option><option value="account">Cuenta</option><option value="card">Tarjeta</option></select></label>
          {form.scope === "account" && <label>Cuenta<select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}>{filteredAccounts.length === 0 ? <option value="">Sin cuentas en {form.currency}</option> : filteredAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          {form.scope === "card" && <label>Tarjeta<select value={form.card_id} onChange={e => setForm({ ...form, card_id: e.target.value })}>{filteredCards.length === 0 ? <option value="">Sin tarjetas en {form.currency}</option> : filteredCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {form.scope === "general" && <label>Tipo de gasto<select value={form.spending_type} onChange={e => setForm({ ...form, spending_type: e.target.value })}><option value="debit">Débito</option><option value="credit">Crédito</option></select></label>}
          {form.period_type === "custom" && <><label>Desde<input required type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></label><label>Hasta<input required type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></label></>}
          <button>Guardar presupuesto</button>
        </form>
      </Modal>
      <Modal open={detailModal.open} title="Detalle de presupuesto" onClose={() => detailModal.close_modal()}>
        {detailId !== null && <BudgetDetailsContent initialId={String(detailId)} />}
      </Modal>
      <Modal open={configModal.open} title="Configurar presupuesto" onClose={() => configModal.close_modal()}>
        {configId !== null && <BudgetConfigurationPanel csrf={csrf} initialId={String(configId)} onArchived={() => { configModal.close_modal(); load(); }} />}
      </Modal>
    </>
  );
}