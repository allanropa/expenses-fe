import { useEffect, useState, FormEvent } from "react";
import { api } from "../../api";
import type { Card, Account, Purchase, Category } from "../../types";
import { money } from "../../utils/formatters";
import { toISODateString } from "../../utils/formatters";
import { Modal, ActionMenu } from "../common";
import { useModal } from "../../hooks";

function CardDetailsContent({ cardId }: { cardId: number }) {
  const [card, setCard] = useState<Card | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  useEffect(() => {
    api<Card>(`/api/cards/${cardId}`).then(setCard).catch(() => undefined);
    api<Purchase[]>(`/api/cards/${cardId}/purchases`).then(setPurchases).catch(() => undefined);
  }, [cardId]);
  if (!card) return <p className="muted">Cargando detalle...</p>;
  const monthlyEstimate = purchases.reduce((s, p) => s + (p.installments[0] ? Number(p.installments[0].estimated_total) : Number(p.amount)), 0);
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

function CardConfigurationPanel({ csrf, cardId, onArchived }: { csrf: string; cardId: number; onArchived: () => void }) {
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

export function CardsView({ csrf }: { csrf: string }) {
  const [cards, setCards] = useState<Card[]>([]);
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
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
    addModal.close_modal();
    setForm({ ...form, name: "" });
    load();
  }

  const totals = cards.reduce<Record<string, number>>((r, c) => { c.currencies.forEach((item) => { r[item.currency] = (r[item.currency] ?? 0) + Number(item.outstanding_debt); }); return r; }, {});

  return (
    <>
      <header className="page-heading">
        <div><p className="eyebrow">Obligaciones</p><h2>Tarjetas</h2></div>
        <button onClick={() => addModal.open_modal()}>Agregar tarjeta</button>
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
                onDetails={() => { setDetailId(card.id); detailModal.open_modal(); }}
                onConfigure={() => { setConfigId(card.id); configModal.open_modal(); }}
              />
            </div>
          ))
        )}
      </section>
      <Modal open={addModal.open} title="Agregar tarjeta" onClose={() => addModal.close_modal()}>
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
      <Modal open={detailModal.open} title="Detalle de tarjeta" onClose={() => detailModal.close_modal()}>
        {detailId !== null && <CardDetailsContent cardId={detailId} />}
      </Modal>
      <Modal open={configModal.open} title="Configurar tarjeta" onClose={() => configModal.close_modal()}>
        {configId !== null && <CardConfigurationPanel csrf={csrf} cardId={configId} onArchived={() => { configModal.close_modal(); load(); }} />}
      </Modal>
    </>
  );
}