import { ReactNode, useState } from "react";
import { ErrorMessage } from "../common";
import { useDashboard } from "../../queries";
import { money } from "../../utils/formatters";

function storedOpenState(key: string) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(key) !== "false";
}

function CollapsibleCard({
  storageKey,
  title,
  className = "",
  children,
}: {
  storageKey: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => storedOpenState(storageKey));

  function handleToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    const nextOpen = event.currentTarget.open;
    setOpen(nextOpen);
    window.localStorage.setItem(storageKey, String(nextOpen));
  }

  return (
    <details
      className={`card collapsible-card ${className}`.trim()}
      open={open}
      onToggle={handleToggle}
    >
      <summary>
        <h3>{title}</h3>
      </summary>
      {children}
    </details>
  );
}

export function DashboardView() {
  const dashboard = useDashboard();
  if (dashboard.error) return <ErrorMessage error={dashboard.error} />;
  const data = dashboard.data;
  if (!data) return <p className="muted">Cargando resumen...</p>;

  const totals = (values: Record<string, string>) =>
    Object.entries(values).map(([currency, value]) => (
      <span key={currency}>{money(value, currency)}</span>
    ));

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Resumen del mes</p>
          <h2>Tu posición financiera</h2>
        </div>
      </header>
      <section className="metric-grid">
        <article className="metric">
          <span>Ingresos</span>
          <strong>{totals(data.income_by_currency)}</strong>
        </article>
        <article className="metric">
          <span>Consumo</span>
          <strong>{totals(data.consumption_by_currency)}</strong>
        </article>
        <article className="metric">
          <span>Cuentas</span>
          <strong>{data.accounts.length}</strong>
        </article>
        <article className="metric">
          <span>Deuda</span>
          <strong>{data.card_debt.length + data.loan_debt.length}</strong>
        </article>
      </section>
      <div className="split-grid">
        <CollapsibleCard storageKey="dashboard.liquidity.open" title="Liquidez">
          {data.accounts.map((account) => (
            <div className="row" key={account.id}>
              <span>{account.name}</span>
              <b>{money(account.balance, account.currency)}</b>
            </div>
          ))}
        </CollapsibleCard>
        <CollapsibleCard storageKey="dashboard.debt.open" title="Deuda">
          {data.card_debt.length === 0 && data.loan_debt.length === 0 && (
            <p className="muted">No hay deuda registrada.</p>
          )}
          {data.card_debt.map((item, index) => (
            <div className="row" key={`card-${item.card_id}-${item.currency}-${index}`}>
              <span>
                {item.card_name} · {item.currency}
              </span>
              <b>{money(item.amount, item.currency)}</b>
            </div>
          ))}
          {data.loan_debt.map((item) => (
            <div className="row" key={`loan-${item.id}`}>
              <span>
                {item.name} · {item.currency}
              </span>
              <b>{money(item.outstanding, item.currency)}</b>
            </div>
          ))}
        </CollapsibleCard>
      </div>
      {data.budgets.length > 0 && (
        <CollapsibleCard storageKey="dashboard.budgets.open" title="Presupuestos" className="mt-3">
          {data.budgets.map((item) => {
            const pct = Math.min(Number(item.percentage_used), 200);
            return (
              <div key={item.budget_id} className="mb-2">
                <div className="row">
                  <span>
                    {item.name}
                    <small>
                      {item.percentage_used}% usado · {item.period_start} a {item.period_end}
                    </small>
                  </span>
                  <b>
                    {money(item.actual_spending, item.currency)} /{" "}
                    {money(item.accumulated_budget, item.currency)}
                  </b>
                </div>
                <div className="budget-progress">
                  <div style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CollapsibleCard>
      )}
      {data.recent_transactions.length > 0 && (
        <CollapsibleCard
          storageKey="dashboard.recent-transactions.open"
          title="Últimos movimientos"
          className="list-card mt-3"
        >
          {data.recent_transactions.map((item) => (
            <div className="list-item" key={`${item.entry_type}-${item.id}`}>
              <div>
                <strong>
                  {item.description ||
                    (item.entry_type === "transfer" ? "Transferencia" : item.transaction_type)}
                  {item.entry_type === "transfer" && <span className="chip">Transferencia</span>}
                  {item.transaction_type === "payment" && <span className="chip">Pago</span>}
                </strong>
                <small>
                  {item.transaction_date} · {item.currency} ·{" "}
                  {item.source || (item.payment_method === "credit" ? "Tarjeta" : "Cuenta")}
                  {item.destination ? ` → ${item.destination}` : ""}
                </small>
              </div>
              <b className={item.transaction_type === "income" ? "positive" : "negative"}>
                {item.transaction_type === "income" ? "+" : "-"}
                {money(item.amount, item.currency)}
                {item.original_amount != null && item.original_currency && (
                  <small> ≈ {money(item.original_amount, item.original_currency)}</small>
                )}
              </b>
            </div>
          ))}
        </CollapsibleCard>
      )}
    </>
  );
}
