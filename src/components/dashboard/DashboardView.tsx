import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Dashboard } from "../../types";
import { money } from "../../utils/formatters";

export function DashboardView() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/api/dashboard")
      .then(setData)
      .catch(() => undefined);
  }, []);

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
          <strong>
            {data.card_debt.length + data.loan_debt.length}
          </strong>
        </article>
      </section>
      <div className="split-grid">
        <section className="card">
          <h3>Liquidez</h3>
          {data.accounts.map((account) => (
            <div className="row" key={account.id}>
              <span>{account.name}</span>
              <b>{money(account.balance, account.currency)}</b>
            </div>
          ))}
        </section>
        <section className="card">
          <h3>Deuda</h3>
          {data.card_debt.length === 0 &&
            data.loan_debt.length === 0 && (
              <p className="muted">No hay deuda registrada.</p>
            )}
          {data.card_debt.map((item, index) => (
            <div
              className="row"
              key={`card-${item.card_id}-${item.currency}-${index}`}
            >
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
        </section>
      </div>
      {data.budgets.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          <h3>Presupuestos</h3>
          {data.budgets.map((item) => {
            const pct = Math.min(Number(item.percentage_used), 200);
            return (
              <div key={item.budget_id} style={{ marginBottom: 8 }}>
                <div className="row">
                  <span>
                    {item.name}
                    <small>
                      {item.percentage_used}% usado · {item.period_start} a{" "}
                      {item.period_end}
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
        </section>
      )}
      {data.recent_transactions.length > 0 && (
        <section className="card list-card" style={{ marginTop: 12 }}>
          <h3>Últimos movimientos</h3>
          {data.recent_transactions.map((item) => (
            <div className="list-item" key={item.id}>
              <div>
                <strong>
                  {item.description || item.transaction_type}
                </strong>
                <small>
                  {item.transaction_date} · {item.currency} ·{" "}
                  {item.source ||
                    (item.payment_method === "credit"
                      ? "Tarjeta"
                      : "Cuenta")}
                </small>
              </div>
              <b
                className={
                  item.transaction_type === "expense"
                    ? "negative"
                    : "positive"
                }
              >
                {item.transaction_type === "expense" ? "-" : "+"}
                {money(item.amount, item.currency)}
              </b>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
