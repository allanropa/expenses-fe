import { useEffect, useState, FormEvent } from "react";
import { api } from "../../api";
import type { Loan, Account, Category } from "../../types";
import { money } from "../../utils/formatters";
import { isPositiveAmount, sumAmounts, sumByCurrency } from "../../utils/amounts";
import { toISODateString } from "../../utils/formatters";
import { Modal, ActionMenu } from "../common";
import { useModal } from "../../hooks";

type PaymentLine = { kind: "capital" | "interes" | "gasto"; amount: string; category_id: string; description: string };

function LoanPaymentPanel({ csrf, loanId, onDone }: { csrf: string; loanId: number; onDone: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [source, setSource] = useState("");
  const [payDate, setPayDate] = useState(toISODateString());
  const [lines, setLines] = useState<PaymentLine[]>([{ kind: "capital", amount: "", category_id: "", description: "" }]);
  useEffect(() => {
    api<Loan>(`/api/loans/${loanId}`).then(v => {
      setLoan(v);
      const pending = v.installments.find(i => i.status !== "paid");
      if (pending) {
        setLines([
          { kind: "capital", amount: pending.principal_amount, category_id: "", description: "" },
          { kind: "interes", amount: pending.interest_amount, category_id: "", description: "Interés" },
        ]);
      }
    }).catch(() => undefined);
    api<Account[]>("/api/accounts").then(setAccounts).catch(() => undefined);
    api<Category[]>("/api/categories").then(setCategories).catch(() => undefined);
  }, [loanId]);
  function addLine() { setLines([...lines, { kind: "capital", amount: "", category_id: "", description: "" }]); }
  function updateLine(i: number, field: keyof PaymentLine, value: string) { const copy = [...lines]; copy[i] = { ...copy[i], [field]: value }; setLines(copy); }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)); }
  const capitalTotal = sumAmounts(lines.filter(l => l.kind === "capital").map(l => l.amount));
  const interestTotal = sumAmounts(lines.filter(l => l.kind === "interes").map(l => l.amount));
  const paymentTotal = sumAmounts([capitalTotal, interestTotal]);
  const expenseCategories = categories.filter(c => c.kind !== "income");
  const matching = accounts.filter(a => loan && a.currency === loan.currency);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!source || !isPositiveAmount(paymentTotal)) return;
    const extras = lines.filter(l => l.kind === "gasto" && l.amount).map(l => ({ amount: l.amount, category_id: Number(l.category_id) || expenseCategories[0]?.id, description: l.description || "Cargo adicional" }));
    await api(`/api/loans/${loanId}/payments`, {
      method: "POST", csrf,
      body: JSON.stringify({
        source_account_id: Number(source),
        payment_date: payDate,
        scheduled_amount: paymentTotal,
        interest_paid: isPositiveAmount(interestTotal) ? interestTotal : undefined,
        extra_charges: extras.length > 0 ? extras : undefined,
      }),
    });
    onDone();
  }
  if (!loan) return <p className="muted">Cargando...</p>;
  return (
    <div className="stack">
      <p className="muted">Pagando: <strong>{loan.name}</strong> · Pendiente: {money(loan.outstanding_principal, loan.currency)}</p>
      <form className="stack" onSubmit={submit}>
        <label>Cuenta origen<select required value={source} onChange={e => setSource(e.target.value)}><option value="">Seleccionar</option>{matching.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
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
            {line.kind === "gasto" && <select value={line.category_id} onChange={e => updateLine(i, "category_id", e.target.value)} style={{ width: 130 }}>{expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
            {line.kind === "gasto" && <input placeholder="Descripción" value={line.description} onChange={e => updateLine(i, "description", e.target.value)} style={{ flex: 1 }} />}
            <button type="button" onClick={() => removeLine(i)} style={{ width: 28 }}>×</button>
          </div>
        ))}
        <button type="button" onClick={addLine}>+ Agregar línea</button>
        {isPositiveAmount(paymentTotal) && <p><strong>Total cuota: {money(paymentTotal, loan.currency)}</strong> (abono {money(capitalTotal, loan.currency)} + interés {money(interestTotal, loan.currency)})</p>}
        <button disabled={!source || !isPositiveAmount(paymentTotal)}>Registrar pago</button>
      </form>
    </div>
  );
}

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
  const payModal = useModal();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
  const [payId, setPayId] = useState<number | null>(null);
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

  const totals = sumByCurrency(loans, (l) => l.currency, (l) => l.outstanding_principal);

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
                onPay={() => { setPayId(loan.id); payModal.open_modal(); }}
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
      <Modal open={payModal.open} title="Pagar préstamo" onClose={() => payModal.close_modal()}>
        {payId !== null && <LoanPaymentPanel csrf={csrf} loanId={payId} onDone={() => { payModal.close_modal(); load(); }} />}
      </Modal>
    </>
  );
}