import { FormEvent, useState } from "react";
import type { Loan } from "../../types";
import { money } from "../../utils/formatters";
import { isPositiveAmount, multiplyAmount, sumAmounts, sumByCurrency } from "../../utils/amounts";
import { toISODateString } from "../../utils/formatters";
import { ActionMenu, ErrorMessage, Modal, MoneyInput, PaginationControls } from "../common";
import { useModal } from "../../hooks";
import {
  useAccounts,
  useCategories,
  useCloseLoan,
  useCreateLoan,
  useLoan,
  useLoanPayments,
  useLoans,
  useRecordLoanPayment,
  useUpdateLoan,
} from "../../queries";

type PaymentLine = {
  kind: "capital" | "interes" | "gasto";
  amount: string;
  category_id: string;
  description: string;
};

function LoanPaymentPanel({ loanId, onDone }: { loanId: number; onDone: () => void }) {
  const loan = useLoan(loanId);
  if (loan.error) return <ErrorMessage error={loan.error} />;
  if (!loan.data) return <p className="muted">Cargando...</p>;
  return <LoanPaymentForm key={loan.data.id} loan={loan.data} onDone={onDone} />;
}

function LoanPaymentForm({ loan, onDone }: { loan: Loan; onDone: () => void }) {
  const accounts = useAccounts();
  const categories = useCategories();
  const recordPayment = useRecordLoanPayment();
  const pending = loan.installments.find((i) => i.status !== "paid");
  const [isAbono, setIsAbono] = useState(false);
  const [abonoAmount, setAbonoAmount] = useState("");
  const [source, setSource] = useState("");
  const [payDate, setPayDate] = useState(toISODateString());
  const [lines, setLines] = useState<PaymentLine[]>(() =>
    pending
      ? [
          { kind: "capital", amount: pending.principal_amount, category_id: "", description: "" },
          {
            kind: "interes",
            amount: pending.interest_amount,
            category_id: "",
            description: "Interés",
          },
        ]
      : [{ kind: "capital", amount: "", category_id: "", description: "" }],
  );
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
  const interestTotal = sumAmounts(lines.filter((l) => l.kind === "interes").map((l) => l.amount));
  const paymentTotal = sumAmounts([capitalTotal, interestTotal]);
  const expenseCategories = (categories.data ?? []).filter((c) => c.kind !== "income");
  const matching = (accounts.data ?? []).filter((a) => a.currency === loan.currency);
  const selectedSource = matching.find((account) => account.id === Number(source));
  const extraChargeTotal = sumAmounts(lines.filter((l) => l.kind === "gasto").map((l) => l.amount));
  const capitalAmount = isAbono ? abonoAmount : capitalTotal;
  const capitalExceedsBalance = isPositiveAmount(
    sumAmounts([capitalAmount, `-${loan.outstanding_principal}`]),
  );
  const amountToDebit = isAbono ? abonoAmount : sumAmounts([paymentTotal, extraChargeTotal]);
  const accountExceedsBalance = Boolean(
    selectedSource &&
    isPositiveAmount(sumAmounts([amountToDebit, `-${selectedSource.current_balance}`])),
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !source ||
      !(isAbono ? isPositiveAmount(abonoAmount) : isPositiveAmount(paymentTotal)) ||
      capitalExceedsBalance ||
      accountExceedsBalance
    )
      return;
    const extras = lines
      .filter((l) => l.kind === "gasto" && l.amount)
      .map((l) => ({
        amount: l.amount,
        category_id: Number(l.category_id) || expenseCategories[0]?.id,
        description: l.description || "Cargo adicional",
      }));
    recordPayment.mutate(
      {
        id: loan.id,
        body: {
          source_account_id: Number(source),
          payment_date: payDate,
          scheduled_amount: isAbono ? undefined : paymentTotal,
          interest_paid: isAbono
            ? undefined
            : isPositiveAmount(interestTotal)
              ? interestTotal
              : undefined,
          extra_principal: isAbono ? abonoAmount : "0",
          recalculate_installments: isAbono,
          is_abono: isAbono,
          extra_charges: isAbono ? undefined : extras.length > 0 ? extras : undefined,
        },
      },
      { onSuccess: onDone },
    );
  }
  return (
    <div className="stack">
      <p className="muted">
        Pagando: <strong>{loan.name}</strong> · Pendiente:{" "}
        {money(loan.outstanding_principal, loan.currency)}
      </p>
      <ErrorMessage error={recordPayment.error ?? accounts.error ?? categories.error} />
      {capitalExceedsBalance && (
        <p className="error" role="alert">
          El abono supera el capital pendiente.
        </p>
      )}
      {accountExceedsBalance && (
        <p className="error" role="alert">
          El pago supera el saldo disponible.
        </p>
      )}
      <form className="stack" onSubmit={submit}>
        <label className="checkbox-label">
          <input type="checkbox" checked={isAbono} onChange={(e) => setIsAbono(e.target.checked)} />
          Este pago es un abono a capital
        </label>
        <label>
          Cuenta origen
          <select required value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Seleccionar</option>
            {matching.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {selectedSource && (
            <small className="muted">
              Disponible: {money(selectedSource.current_balance, selectedSource.currency)}
            </small>
          )}
        </label>
        <label>
          Fecha
          <input
            required
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
        </label>
        {isAbono ? (
          <label>
            Monto del abono
            <MoneyInput
              required
              currency={loan.currency}
              aria-label="Monto del abono"
              value={abonoAmount}
              onChange={(e) => setAbonoAmount(e.target.value)}
            />
          </label>
        ) : (
          <>
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
                <MoneyInput
                  required
                  currency={loan.currency}
                  aria-label="Monto"
                  placeholder="Monto"
                  value={line.amount}
                  onChange={(e) => updateLine(i, "amount", e.target.value)}
                  className="line-amount"
                />
                {line.kind === "gasto" && (
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
                {line.kind === "gasto" && (
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
            {isPositiveAmount(paymentTotal) && (
              <p>
                <strong>Total cuota: {money(paymentTotal, loan.currency)}</strong> (abono{" "}
                {money(capitalTotal, loan.currency)} + interés {money(interestTotal, loan.currency)}
                )
              </p>
            )}
          </>
        )}
        <button
          disabled={
            !source ||
            !(isAbono ? isPositiveAmount(abonoAmount) : isPositiveAmount(paymentTotal)) ||
            capitalExceedsBalance ||
            accountExceedsBalance
          }
        >
          {isAbono ? "Registrar abono" : "Registrar pago"}
        </button>
      </form>
    </div>
  );
}

function LoanConfigurationPanel({ loanId, onClosed }: { loanId: number; onClosed: () => void }) {
  const loan = useLoan(loanId);
  if (loan.error) return <ErrorMessage error={loan.error} />;
  if (!loan.data) return <p className="muted">Cargando...</p>;
  return <LoanConfigurationForm key={loan.data.id} loan={loan.data} onClosed={onClosed} />;
}

function LoanConfigurationForm({ loan, onClosed }: { loan: Loan; onClosed: () => void }) {
  const updateLoan = useUpdateLoan();
  const closeLoan = useCloseLoan();
  const closeModal = useModal();
  const [name, setName] = useState(loan.name);
  function save(event: FormEvent) {
    event.preventDefault();
    updateLoan.mutate({ id: loan.id, body: { name } });
  }
  return (
    <div className="stack">
      <p className="muted">
        Configurando: <strong>{loan.name}</strong>
      </p>
      <ErrorMessage error={updateLoan.error} />
      <form className="stack" onSubmit={save}>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button>Guardar cambios</button>
      </form>
      <button
        type="button"
        className="danger-button"
        onClick={() => {
          closeLoan.reset();
          closeModal.openModal();
        }}
      >
        Cerrar préstamo
      </button>
      <Modal open={closeModal.open} title="Cerrar préstamo" onClose={() => closeModal.closeModal()}>
        <div className="stack">
          <p>El préstamo se cerrará.</p>
          <p>
            Las cuotas pendientes se eliminarán, pero se conservarán los pagos existentes y los
            registros financieros.
          </p>
          <p>
            <strong>Esta acción no se puede deshacer.</strong>
          </p>
          <ErrorMessage error={closeLoan.error} />
          <div className="archive-actions">
            <button type="button" className="link-button" onClick={() => closeModal.closeModal()}>
              Cancelar
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={closeLoan.isPending}
              onClick={() => closeLoan.mutate(loan.id, { onSuccess: onClosed })}
            >
              {closeLoan.isPending ? "Cerrando..." : "Confirmar cierre"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function LoanDetailsContent({ loanId }: { loanId: number }) {
  const loan = useLoan(loanId);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentPageSize, setPaymentPageSize] = useState(10);
  const payments = useLoanPayments(loanId, {
    status: paymentStatus,
    limit: paymentPageSize,
    offset: paymentPage * paymentPageSize,
  });
  if (loan.error) return <ErrorMessage error={loan.error} />;
  if (!loan.data) return <p className="muted">Cargando préstamo...</p>;
  const current = loan.data;
  return (
    <>
      <div className="detail-grid">
        <div>
          <small>Saldo pendiente</small>
          <strong>{money(current.outstanding_principal, current.currency)}</strong>
        </div>
        <div>
          <small>Interés efectivo anual</small>
          <strong>{multiplyAmount(current.annual_effective_rate, "100", 4)}%</strong>
        </div>
        <div>
          <small>Plazo</small>
          <strong>{current.term_months} meses</strong>
        </div>
        <div>
          <small>Cuota estimada</small>
          <strong>
            {current.installments[0]
              ? money(current.installments[0].total_amount, current.currency)
              : "-"}
          </strong>
        </div>
      </div>
      <div className="loan-payments-heading">
        <h4>Pagos</h4>
        <select
          aria-label="Estado de pagos"
          value={paymentStatus}
          onChange={(event) => {
            setPaymentStatus(event.target.value as "paid" | "pending");
            setPaymentPage(0);
          }}
        >
          <option value="paid">Realizados</option>
          <option value="pending">Pendientes</option>
        </select>
      </div>
      {payments.error ? (
        <ErrorMessage error={payments.error} />
      ) : payments.isPending ? (
        <p className="muted">Cargando pagos...</p>
      ) : payments.data?.length === 0 ? (
        <p className="muted">
          {paymentStatus === "paid" ? "No hay pagos registrados." : "No hay pagos pendientes."}
        </p>
      ) : (
        payments.data?.map((payment) => (
          <div className="row" key={payment.id}>
            <span>
              {paymentStatus === "pending"
                ? "Vence "
                : payment.kind === "abono"
                  ? "Abono "
                  : "Pago "}
              {payment.date}
              <small>
                Capital {money(payment.principal_amount, current.currency)} · Interés{" "}
                {money(payment.interest_amount, current.currency)}
                {payment.kind === "abono" && (
                  <> · Abono extra {money(payment.extra_principal, current.currency)}</>
                )}
              </small>
            </span>
            <b>{money(payment.amount, current.currency)}</b>
          </div>
        ))
      )}
      <PaginationControls
        page={paymentPage}
        pageSize={paymentPageSize}
        itemCount={payments.data?.length ?? 0}
        onPageChange={setPaymentPage}
        onPageSizeChange={(nextPageSize) => {
          setPaymentPage(0);
          setPaymentPageSize(nextPageSize);
        }}
      />
    </>
  );
}

export function LoansView() {
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const loans = useLoans({ limit: pageSize, offset: page * pageSize, archived: showArchived });
  const accounts = useAccounts();
  const createLoan = useCreateLoan();
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const payModal = useModal();
  const [notice, setNotice] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
  const [payId, setPayId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    principal_amount: "",
    currency: "COP",
    annual_effective_rate: "",
    term_months: "12",
    start_date: toISODateString(),
    first_payment_date: toISODateString(),
    source_account_id: "",
    record_as_income: false,
  });

  const list = loans.data ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    createLoan.mutate(
      {
        ...form,
        principal_amount: form.principal_amount,
        annual_effective_rate: multiplyAmount(form.annual_effective_rate, "0.01", 12),
        term_months: Number(form.term_months),
        source_account_id: form.source_account_id ? Number(form.source_account_id) : undefined,
      },
      {
        onSuccess: () => {
          addModal.closeModal();
          setForm({ ...form, name: "", principal_amount: "", annual_effective_rate: "" });
        },
      },
    );
  }

  const totals = sumByCurrency(
    list,
    (l) => l.currency,
    (l) => l.outstanding_principal,
  );

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Deuda recibida</p>
          <h2>Préstamos</h2>
        </div>
        <button
          onClick={() => {
            createLoan.reset();
            addModal.openModal();
          }}
        >
          Agregar préstamo
        </button>
      </header>
      <section className="summary-strip">
        <strong>{list.length} préstamos</strong>
        {Object.entries(totals).map(([cur, amt]) => (
          <span key={cur}>
            Pendiente {cur}: {money(amt, cur)}
          </span>
        ))}
      </section>
      <div className="list-tabs" aria-label="Préstamos">
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
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <section className="card list-card">
        <ErrorMessage error={loans.error} />
        {loans.isPending && !loans.error ? (
          <p className="muted">Cargando préstamos...</p>
        ) : list.length === 0 && !loans.error ? (
          <p className="muted">No hay préstamos registrados.</p>
        ) : (
          list.map((loan) => (
            <div className="list-item" key={loan.id}>
              <div>
                <strong>{loan.name}</strong>
                <small>
                  {loan.term_months} meses · EA{" "}
                  {multiplyAmount(loan.annual_effective_rate, "100", 4)}%
                </small>
              </div>
              <b>{money(loan.outstanding_principal, loan.currency)}</b>
              {showArchived ? (
                <ActionMenu
                  onDetails={() => {
                    setDetailId(loan.id);
                    detailModal.openModal();
                  }}
                />
              ) : (
                <ActionMenu
                  onDetails={() => {
                    setDetailId(loan.id);
                    detailModal.openModal();
                  }}
                  onConfigure={() => {
                    setConfigId(loan.id);
                    configModal.openModal();
                  }}
                  onPay={() => {
                    setPayId(loan.id);
                    payModal.openModal();
                  }}
                />
              )}
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
      <Modal open={addModal.open} title="Agregar préstamo" onClose={() => addModal.closeModal()}>
        <form className="stack" onSubmit={submit}>
          <ErrorMessage error={createLoan.error} />
          <label>
            Nombre
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Principal
            <MoneyInput
              required
              currency={form.currency}
              value={form.principal_amount}
              onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
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
            Interés efectivo anual (%)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="12.68"
              value={form.annual_effective_rate}
              onChange={(e) => setForm({ ...form, annual_effective_rate: e.target.value })}
            />
          </label>
          <label>
            Plazo en meses
            <input
              required
              type="number"
              min="1"
              max="360"
              value={form.term_months}
              onChange={(e) => setForm({ ...form, term_months: e.target.value })}
            />
          </label>
          <label>
            Fecha de inicio
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </label>
          <label>
            Primera cuota
            <input
              required
              type="date"
              value={form.first_payment_date}
              onChange={(e) => setForm({ ...form, first_payment_date: e.target.value })}
            />
          </label>
          <label>
            Cuenta destino
            <select
              value={form.source_account_id}
              onChange={(e) => setForm({ ...form, source_account_id: e.target.value })}
            >
              <option value="">Sin cuenta</option>
              {(accounts.data ?? [])
                .filter((a) => a.currency === form.currency)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.record_as_income}
              onChange={(e) => setForm({ ...form, record_as_income: e.target.checked })}
            />{" "}
            Registrar como ingreso
          </label>
          <button>Guardar préstamo</button>
        </form>
      </Modal>
      <Modal
        open={detailModal.open}
        title="Detalle y pagos del préstamo"
        onClose={() => detailModal.closeModal()}
      >
        {detailId !== null && <LoanDetailsContent loanId={detailId} />}
      </Modal>
      <Modal
        open={configModal.open}
        title="Configurar préstamo"
        onClose={() => configModal.closeModal()}
      >
        {configId !== null && (
          <LoanConfigurationPanel
            loanId={configId}
            onClosed={() => {
              configModal.closeModal();
              setNotice("Préstamo cerrado correctamente.");
            }}
          />
        )}
      </Modal>
      <Modal open={payModal.open} title="Pagar préstamo" onClose={() => payModal.closeModal()}>
        {payId !== null && <LoanPaymentPanel loanId={payId} onDone={() => payModal.closeModal()} />}
      </Modal>
    </>
  );
}
