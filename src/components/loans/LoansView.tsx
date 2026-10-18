import { useEffect, useState, FormEvent } from "react";
import { api } from "../../api";
import type { Loan, Account, Category } from "../../types";
import { money } from "../../utils/formatters";
import { toISODateString } from "../../utils/formatters";
import { Modal, ActionMenu } from "../common";
import { useModal } from "../../hooks";

function LoanConfigurationPanel({ csrf, loanId, onArchived }: { csrf: string; loanId: number; onArchived: () => void }) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [firstPayment, setFirstPayment] = useState("");
  useEffect(() => {
    api<Loan>(`/api/loans/${loanId}`).then(v => {
      setLoan(v);
      setName(v.name);
      setRate(String(Number(v.annual_effective_rate) * 100));
      setTerm(String(v.term_months));
      setStartDate(v.start_date);
      setFirstPayment(v.first_payment_date);
    }).catch(() => undefined);
  }, [loanId]);
  async function save(event: FormEvent) {
    event.preventDefault();
    await api(`/api/loans/${loanId}`, {
      method: "PATCH", csrf,
      body: JSON.stringify({
        name,
        annual_effective_rate: rate ? String(Number(rate) / 100) : undefined,
        term_months: term ? Number(term) : undefined,
        start_date: startDate || undefined,
        first_payment_date: firstPayment || undefined,
      }),
    });
  }
  async function archive() { await api(`/api/loans/${loanId}/archive`, { method: "POST", csrf }); onArchived(); }
  if (!loan) return <p className="muted">Cargando...</p>;
  return (
    <div className="stack">
      <p className="muted">Configurando: <strong>{loan.name}</strong></p>
      <form className="stack" onSubmit={save}>
        <label>Nombre<input value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Interés efectivo anual (%)<input type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} /></label>
        <label>Plazo en meses<input type="number" min="1" max="360" value={term} onChange={e => setTerm(e.target.value)} /></label>
        <label>Fecha de inicio<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
        <label>Primera cuota<input type="date" value={firstPayment} onChange={e => setFirstPayment(e.target.value)} /></label>
        <button>Guardar cambios</button>
      </form>
      <button type="button" className="danger-button" onClick={archive}>Archivar préstamo</button>
    </div>
  );
}

function LoanDetailsContent({ csrf, loanId }: { csrf: string; loanId: number }) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [extra, setExtra] = useState("");
  const [scheduledAmount, setScheduledAmount] = useState("");
  const [date, setDate] = useState(toISODateString());
  const load = () => api<Loan>(`/api/loans/${loanId}`).then(setLoan).catch(() => undefined);
  useEffect(() => {
    load();
    api<Account[]>("/api/accounts").then((values) => {
      const matches = values.filter(a => a.currency === loan?.currency);
      setAccounts(matches);
      if (matches[0]) setAccountId(String(matches[0].id));
    }).catch(() => undefined);
  }, [loanId, loan?.currency]);
  async function pay(event: FormEvent) {
    event.preventDefault();
    await api(`/api/loans/${loanId}/payments`, {
      method: "POST", csrf,
      body: JSON.stringify({ source_account_id: Number(accountId), payment_date: date, scheduled_amount: scheduledAmount || undefined, extra_principal: extra || "0" }),
    });
    setExtra(""); setScheduledAmount(""); load();
  }
  if (!loan) return <p className="muted">Cargando préstamo...</p>;
  return (
    <>
      <div className="detail-grid">
        <div><small>Saldo pendiente</small><strong>{money(loan.outstanding_principal, loan.currency)}</strong></div>
        <div><small>Interés efectivo anual</small><strong>{Number(loan.annual_effective_rate) * 100}%</strong></div>
        <div><small>Plazo</small><strong>{loan.term_months} meses</strong></div>
        <div><small>Cuota estimada</small><strong>{loan.installments[0] ? money(loan.installments[0].total_amount, loan.currency) : "-"}</strong></div>
      </div>
      <form className="inline-form" onSubmit={pay}>
        <label>Cuenta origen<select required value={accountId} onChange={e => setAccountId(e.target.value)}>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Monto a pagar<input type="number" min="0" step="0.01" value={scheduledAmount} onChange={e => setScheduledAmount(e.target.value)} placeholder={loan.installments[0]?.total_amount ?? ""} /></label>
        <label>Abono extra a capital<input type="number" min="0" step="0.01" value={extra} onChange={e => setExtra(e.target.value)} /></label>
        <label>Fecha<input required type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <button>Registrar pago</button>
      </form>
      <h4>Plan de cuotas</h4>
      {loan.installments.slice(0, 12).map(item => (
        <div className="row" key={item.installment_number}>
          <span>Cuota {item.installment_number}<small>{item.due_date} · {item.status}</small></span>
          <b>{money(item.total_amount, loan.currency)}</b>
        </div>
      ))}
    </>
  );
}

export function LoansView({ csrf }: { csrf: string }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", principal_amount: "", currency: "COP", annual_effective_rate: "",
    term_months: "12", start_date: toISODateString(), first_payment_date: toISODateString(),
    source_account_id: "", record_as_income: false,
  });

  const load = () => api<Loan[]>("/api/loans").then(setLoans).catch(() => undefined);
  useEffect(() => {
    load();
    api<Account[]>("/api/accounts").then(setAccounts).catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api("/api/loans", {
      method: "POST", csrf,
      body: JSON.stringify({ ...form, principal_amount: form.principal_amount, annual_effective_rate: String(Number(form.annual_effective_rate) / 100), term_months: Number(form.term_months), source_account_id: form.source_account_id ? Number(form.source_account_id) : undefined }),
    });
    addModal.close_modal();
    setForm({ ...form, name: "", principal_amount: "", annual_effective_rate: "" });
    load();
  }

  const totals = loans.reduce<Record<string, number>>((r, l) => { r[l.currency] = (r[l.currency] ?? 0) + Number(l.outstanding_principal); return r; }, {});

  return (
    <>
      <header className="page-heading">
        <div><p className="eyebrow">Deuda recibida</p><h2>Préstamos</h2></div>
        <button onClick={() => addModal.open_modal()}>Agregar préstamo</button>
      </header>
      <section className="summary-strip">
        <strong>{loans.length} préstamos</strong>
        {Object.entries(totals).map(([cur, amt]) => <span key={cur}>Pendiente {cur}: {money(amt, cur)}</span>)}
      </section>
      <section className="card list-card">
        {loans.length === 0 ? <p className="muted">No hay préstamos registrados.</p> : (
          loans.map(loan => (
            <div className="list-item" key={loan.id}>
              <div><strong>{loan.name}</strong><small>{loan.term_months} meses · EA {Number(loan.annual_effective_rate) * 100}%</small></div>
              <b>{money(loan.outstanding_principal, loan.currency)}</b>
              <ActionMenu
                onDetails={() => { setDetailId(loan.id); detailModal.open_modal(); }}
                onConfigure={() => { setConfigId(loan.id); configModal.open_modal(); }}
              />
            </div>
          ))
        )}
      </section>
      <Modal open={addModal.open} title="Agregar préstamo" onClose={() => addModal.close_modal()}>
        <form className="stack" onSubmit={submit}>
          <label>Nombre<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Principal<input required type="number" min="0" step="0.01" value={form.principal_amount} onChange={e => setForm({ ...form, principal_amount: e.target.value })} /></label>
          <label>Moneda<select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}><option>COP</option><option>USD</option></select></label>
          <label>Interés efectivo anual (%)<input required type="number" min="0" step="0.01" placeholder="12.68" value={form.annual_effective_rate} onChange={e => setForm({ ...form, annual_effective_rate: e.target.value })} /></label>
          <label>Plazo en meses<input required type="number" min="1" max="360" value={form.term_months} onChange={e => setForm({ ...form, term_months: e.target.value })} /></label>
          <label>Fecha de inicio<input required type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></label>
          <label>Primera cuota<input required type="date" value={form.first_payment_date} onChange={e => setForm({ ...form, first_payment_date: e.target.value })} /></label>
          <label>Cuenta destino<select value={form.source_account_id} onChange={e => setForm({ ...form, source_account_id: e.target.value })}><option value="">Sin cuenta</option>{accounts.filter(a => a.currency === form.currency).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label className="checkbox-label"><input type="checkbox" checked={form.record_as_income} onChange={e => setForm({ ...form, record_as_income: e.target.checked })} /> Registrar como ingreso</label>
          <button>Guardar préstamo</button>
        </form>
      </Modal>
      <Modal open={detailModal.open} title="Detalle y pagos del préstamo" onClose={() => detailModal.close_modal()}>
        {detailId !== null && <LoanDetailsContent csrf={csrf} loanId={detailId} />}
      </Modal>
      <Modal open={configModal.open} title="Configurar préstamo" onClose={() => configModal.close_modal()}>
        {configId !== null && <LoanConfigurationPanel csrf={csrf} loanId={configId} onArchived={() => { configModal.close_modal(); load(); }} />}
      </Modal>
    </>
  );
}