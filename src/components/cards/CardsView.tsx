import { useEffect, useState, FormEvent } from "react";
import { api } from "../../api";
import type { Card, Account, Purchase, Category } from "../../types";
import { money } from "../../utils/formatters";
import { toISODateString } from "../../utils/formatters";
import { isPositiveAmount, multiplyAmount, sumAmounts, sumByCurrency } from "../../utils/amounts";
import { Modal, ActionMenu } from "../common";
import { useModal } from "../../hooks";
import { useSession } from "../../session";

type PaymentLine = { kind: "capital" | "interes" | "gasto"; amount: string; category_id: string; description: string };

function CardPaymentPanel({ cardId, onDone }: { cardId: number; onDone: () => void }) {
  const { csrf_token: csrf } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lines, setLines] = useState<PaymentLine[]>([{ kind: "capital", amount: "", category_id: "", description: "" }]);
  const [source, setSource] = useState("");
  const [currency, setCurrency] = useState("");
  const [rate, setRate] = useState("");
  const [payDate, setPayDate] = useState(toISODateString());
  useEffect(() => {
    api<Card>(`/api/cards/${cardId}`).then(v => { setCard(v); if (v.currencies[0]) setCurrency(v.currencies[0].currency); }).catch(() => undefined);
    api<Account[]>("/api/accounts").then(setAccounts).catch(() => undefined);
    api<Category[]>("/api/categories").then(setCategories).catch(() => undefined);
  }, [cardId]);
  function addLine() { setLines([...lines, { kind: "capital", amount: "", category_id: "", description: "" }]); }
  function updateLine(i: number, field: keyof PaymentLine, value: string) { const copy = [...lines]; copy[i] = { ...copy[i], [field]: value }; setLines(copy); }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)); }
  const capitalTotal = sumAmounts(lines.filter(l => l.kind === "capital").map(l => l.amount));
  const extraTotal = sumAmounts(lines.filter(l => l.kind !== "capital").map(l => l.amount));
  const expenseCategories = categories.filter(c => c.kind !== "income");
  const selectedAccount = accounts.find(a => a.id === Number(source));
  const isMultiCurrency = Boolean(selectedAccount && selectedAccount.currency !== currency);
  const sourceDecimals = selectedAccount?.currency === "COP" ? 0 : 2;
  const sourceAmount = isMultiCurrency && rate ? multiplyAmount(capitalTotal, rate, sourceDecimals) : "";
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!source || !isPositiveAmount(capitalTotal)) return;
    const extras = lines.filter(l => l.kind !== "capital" && l.amount).map(l => ({ amount: l.amount, category_id: Number(l.category_id) || expenseCategories[0]?.id, description: l.description || (l.kind === "interes" ? "Interés" : "Cargo adicional") }));
    await api(`/api/cards/${cardId}/payments`, {
      method: "POST", csrf,
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        card_id: cardId,
        source_account_id: Number(source),
        obligation_amount: capitalTotal,
        obligation_currency: currency,
        source_amount: isMultiCurrency ? sourceAmount : undefined,
        exchange_rate: isMultiCurrency ? rate : undefined,
        payment_date: payDate,
        extra_charges: extras.length > 0 ? extras : undefined,
      }),
    });
    onDone();
  }
  if (!card) return <p className="muted">Cargando...</p>;
  return (
    <div className="stack">
      <p className="muted">Pagando: <strong>{card.name}</strong> · Deuda {currency}: {money(card.currencies.find(c => c.currency === currency)?.outstanding_debt ?? "0", currency)}</p>
      <form className="stack" onSubmit={submit}>
        <label>Moneda<select value={currency} onChange={e => setCurrency(e.target.value)}>{card.currencies.map(c => <option key={c.currency}>{c.currency}</option>)}</select></label>
        <label>Cuenta origen<select required value={source} onChange={e => { setSource(e.target.value); setRate(""); }}><option value="">Seleccionar</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></label>
        {isMultiCurrency && (
          <label>Tasa de cambio ({currency} a {selectedAccount!.currency})<input required type="number" min="0" step="0.0001" placeholder="4000" value={rate} onChange={e => setRate(e.target.value)} /></label>
        )}
        <label>Fecha<input required type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></label>
        <h4>Líneas de pago</h4>
        {lines.map((line, i) => (
          <div className="row" key={i} style={{ flexWrap: "wrap", gap: 4 }}>
            <select value={line.kind} onChange={e => updateLine(i, "kind", e.target.value)} style={{ width: 88 }}>
              <option value="capital">Abono</option>
              <option value="interes">Interés</option>
              <option value="gasto">Gasto</option>
            </select>
            <input required type="number" min="0" step="0.01" placeholder="Monto" value={line.amount} onChange={e => updateLine(i, "amount", e.target.value)} style={{ width: 100 }} />
            {line.kind !== "capital" && <select value={line.category_id} onChange={e => updateLine(i, "category_id", e.target.value)} style={{ width: 130 }}>{expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
            {line.kind !== "capital" && <input placeholder="Descripción" value={line.description} onChange={e => updateLine(i, "description", e.target.value)} style={{ flex: 1 }} />}
            <button type="button" onClick={() => removeLine(i)} style={{ width: 28 }}>×</button>
          </div>
        ))}
        <button type="button" onClick={addLine}>+ Agregar línea</button>
        {isPositiveAmount(capitalTotal) && <p><strong>Total abono: {money(capitalTotal, currency)}</strong></p>}
        {isPositiveAmount(extraTotal) && <p><strong>Cargos adicionales: {money(extraTotal, currency)}</strong></p>}
        {isMultiCurrency && rate && <p><strong>Total a descontar ({selectedAccount!.currency}): {money(multiplyAmount(sumAmounts([capitalTotal, extraTotal]), rate, sourceDecimals), selectedAccount!.currency)}</strong></p>}
        {!isMultiCurrency && (isPositiveAmount(capitalTotal) || isPositiveAmount(extraTotal)) && <p><strong>Total a pagar: {money(sumAmounts([capitalTotal, extraTotal]), currency)}</strong></p>}
        <button disabled={!source || !isPositiveAmount(capitalTotal) || (isMultiCurrency && !rate)}>Registrar pago</button>
      </form>
    </div>
  );
}

function CardDetailsContent({ cardId }: { cardId: number }) {
  const [card, setCard] = useState<Card | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  useEffect(() => {
    api<Card>(`/api/cards/${cardId}`).then(setCard).catch(() => undefined);
    api<Purchase[]>(`/api/cards/${cardId}/purchases`).then(setPurchases).catch(() => undefined);
  }, [cardId]);
  if (!card) return <p className="muted">Cargando detalle...</p>;
  const monthlyEstimate = sumAmounts(purchases.map(p => p.installments[0] ? p.installments[0].estimated_total : p.amount));
  return (
    <>
      <div className="detail-grid">
        {card.currencies.map((item) => (
          <div key={item.currency}>
            <small>Deuda {item.currency}</small>
            <strong>{money(item.outstanding_debt, item.currency)}</strong>
          </div>
        ))}
      </div>
      <p className="muted">Cuota estimada mensual: {money(monthlyEstimate, card.currencies[0]?.currency ?? "COP")}</p>
      <h4>Tasas mensuales</h4>
      {card.interest_rates.length === 0 ? (
        <p className="muted">No hay tasas configuradas.</p>
      ) : (
        card.interest_rates.map((rate) => (
          <div className="row" key={rate.id}>
            <span>{rate.currency ?? "Todas las monedas"}<small>{rate.effective_from}{rate.effective_to ? ` a ${rate.effective_to}` : " en adelante"}</small></span>
            <b>{Number(rate.monthly_rate) * 100}%</b>
          </div>
        ))
      )}
      <h4>Compras recientes</h4>
      {purchases.map((purchase) => (
        <div className="row" key={purchase.id}>
          <span>{purchase.description}<small>{purchase.installments_count} cuotas · {purchase.purchase_date} · tasa {Number(purchase.monthly_interest_rate) * 100}%</small></span>
          <b>{money(purchase.amount, purchase.currency)}</b>
        </div>
      ))}
    </>
  );
}

function CardConfigurationPanel({ cardId, onArchived }: { cardId: number; onArchived: () => void }) {
  const { csrf_token: csrf } = useSession();
  const [card, setCard] = useState<Card | null>(null);
  const [currency, setCurrency] = useState("COP");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(toISODateString());
  const [effectiveTo, setEffectiveTo] = useState("");
  const [targetDebt, setTargetDebt] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(toISODateString());
  useEffect(() => {
    api<Card>(`/api/cards/${cardId}`).then((value) => {
      setCard(value);
      const cur = value.currencies[0]?.currency ?? "COP";
      setCurrency(cur);
      const rate = value.interest_rates.find((r) => r.currency === cur || r.currency === null);
      if (rate) setMonthlyRate(String(Number(rate.monthly_rate) * 100));
    }).catch(() => undefined);
  }, [cardId]);
  async function saveRate(event: FormEvent) { event.preventDefault(); await api(`/api/cards/${cardId}/interest-rates`, { method: "POST", csrf, body: JSON.stringify({ currency, monthly_rate: String(Number(monthlyRate) / 100), effective_from: effectiveFrom, effective_to: effectiveTo || null }) }); setMonthlyRate(""); }
  async function adjustDebt(event: FormEvent) { event.preventDefault(); await api(`/api/cards/${cardId}/balance-adjustments`, { method: "POST", csrf, headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ currency, target_debt: targetDebt, adjustment_date: adjustmentDate, description: "Ajuste manual de deuda" }) }); setTargetDebt(""); }
  async function archive() { await api(`/api/cards/${cardId}/archive`, { method: "POST", csrf }); onArchived(); }
  if (!card) return <p className="muted">Cargando configuración...</p>;
  return (
    <div className="stack">
      <p className="muted">Configurando: <strong>{card.name}</strong></p>
      <form className="stack" onSubmit={saveRate}>
        <h4>Interés mensual</h4>
        <label>Moneda<select value={currency} onChange={(e) => setCurrency(e.target.value)}>{card.currencies.map((c) => <option key={c.currency}>{c.currency}</option>)}</select></label>
        <label>Tasa mensual (%)<input required type="number" min="0" step="0.00000001" placeholder="2.12345678" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} /></label>
        <label>Vigente desde<input required type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></label>
        <label>Vigente hasta<input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} /></label>
        <button>Guardar tasa</button>
      </form>
      <form className="stack" onSubmit={adjustDebt}>
        <h4>Ajustar deuda</h4>
        <label>Deuda objetivo<input required type="number" min="0" step="0.01" value={targetDebt} onChange={(e) => setTargetDebt(e.target.value)} /></label>
        <label>Fecha<input required type="date" value={adjustmentDate} onChange={(e) => setAdjustmentDate(e.target.value)} /></label>
        <button>Registrar ajuste</button>
      </form>
      <button type="button" className="danger-button" onClick={archive}>Archivar tarjeta</button>
    </div>
  );
}

export function CardsView() {
  const { csrf_token: csrf } = useSession();
  const [cards, setCards] = useState<Card[]>([]);
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const payModal = useModal();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
  const [payId, setPayId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", issuing_bank: "", description: "", statement_closing_day: "15", currency: "COP", credit_limit: "" });

  const load = () => api<Card[]>("/api/cards").then(setCards).catch(() => undefined);
  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api("/api/cards", {
      method: "POST",
      csrf,
      body: JSON.stringify({
        name: form.name,
        issuing_bank: form.issuing_bank || null,
        description: form.description || null,
        statement_closing_day: Number(form.statement_closing_day),
        currencies: [{ currency: form.currency, credit_limit: form.credit_limit || null }],
      }),
    });
    addModal.closeModal();
    setForm({ ...form, name: "" });
    load();
  }

  const totals = sumByCurrency(cards.flatMap(c => c.currencies), item => item.currency, item => item.outstanding_debt);

  return (
    <>
      <header className="page-heading">
        <div><p className="eyebrow">Obligaciones</p><h2>Tarjetas</h2></div>
        <button onClick={() => addModal.openModal()}>Agregar tarjeta</button>
      </header>
      <section className="summary-strip">
        <strong>{cards.length} tarjetas</strong>
        {Object.entries(totals).map(([cur, amt]) => <span key={cur}>Deuda {cur}: {money(amt, cur)}</span>)}
      </section>
      <section className="card list-card">
        {cards.length === 0 ? <p className="muted">No hay tarjetas registradas.</p> : (
          cards.map((card) => (
            <div className="list-item" key={card.id}>
              <div>
                <strong>{card.name}</strong>
                <small>Corte día {card.statement_closing_day} · {card.currencies.map(c => c.currency).join(" · ")}</small>
              </div>
              <b>{card.currencies.map(c => money(c.outstanding_debt, c.currency)).join(" / ")}</b>
              <ActionMenu
                onDetails={() => { setDetailId(card.id); detailModal.openModal(); }}
                onConfigure={() => { setConfigId(card.id); configModal.openModal(); }}
                onPay={() => { setPayId(card.id); payModal.openModal(); }}
              />
            </div>
          ))
        )}
      </section>
      <Modal open={addModal.open} title="Agregar tarjeta" onClose={() => addModal.closeModal()}>
        <form className="stack" onSubmit={submit}>
          <label>Nombre<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Banco emisor<input value={form.issuing_bank} onChange={e => setForm({ ...form, issuing_bank: e.target.value })} /></label>
          <label>Descripción<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
          <label>Día de corte<input required type="number" min="1" max="31" value={form.statement_closing_day} onChange={e => setForm({ ...form, statement_closing_day: e.target.value })} /></label>
          <label>Moneda<select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}><option>COP</option><option>USD</option></select></label>
          <label>Cupo de crédito<input type="number" min="0" step="0.01" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} /></label>
          <button>Guardar tarjeta</button>
        </form>
      </Modal>
      <Modal open={detailModal.open} title="Detalle de tarjeta" onClose={() => detailModal.closeModal()}>
        {detailId !== null && <CardDetailsContent cardId={detailId} />}
      </Modal>
      <Modal open={configModal.open} title="Configurar tarjeta" onClose={() => configModal.closeModal()}>
        {configId !== null && <CardConfigurationPanel cardId={configId} onArchived={() => { configModal.closeModal(); load(); }} />}
      </Modal>
      <Modal open={payModal.open} title="Pagar tarjeta" onClose={() => payModal.closeModal()}>
        {payId !== null && <CardPaymentPanel cardId={payId} onDone={() => { payModal.closeModal(); load(); }} />}
      </Modal>
    </>
  );
}