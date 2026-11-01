import { ReactNode, useState } from "react";
import { ErrorMessage } from "../common";
import { useCategories, useDashboard } from "../../queries";
import { money, toISODateString } from "../../utils/formatters";

function currentMonthValue() {
  return toISODateString().slice(0, 7);
}

function monthRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const today = new Date();
  const first = new Date(year || today.getFullYear(), (month || today.getMonth() + 1) - 1, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return { start: toISODateString(first), end: toISODateString(last) };
}

function shiftedMonthValue(offset: number) {
  const today = new Date();
  return toISODateString(new Date(today.getFullYear(), today.getMonth() + offset, 1)).slice(0, 7);
}

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
  const [period, setPeriod] = useState<"current" | "previous" | "custom">("current");
  const [customMonth, setCustomMonth] = useState(currentMonthValue);
  const selectedMonth =
    period === "current"
      ? shiftedMonthValue(0)
      : period === "previous"
        ? shiftedMonthValue(-1)
        : customMonth;
  const periodParams = monthRange(selectedMonth);
  const dashboard = useDashboard({ date_from: periodParams.start, date_to: periodParams.end });
  const categories = useCategories();
  if (dashboard.error) return <ErrorMessage error={dashboard.error} />;
  if (categories.error) return <ErrorMessage error={categories.error} />;
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
          <p className="eyebrow">Resumen financiero</p>
          <h2>Tu posición financiera</h2>
        </div>
        <div className="dashboard-filter">
          <label>
            Periodo
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as typeof period)}
            >
              <option value="current">Este mes</option>
              <option value="previous">Mes anterior</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          {period === "custom" && (
            <label>
              Mes
              <input
                type="month"
                value={customMonth}
                onChange={(event) => setCustomMonth(event.target.value)}
              />
            </label>
          )}
        </div>
      </header>
      <section className="dashboard-overview">
        <article className="dashboard-consumption metric">
          <span>Consumo del periodo</span>
          <strong>{totals(data.consumption_by_currency)}</strong>
          <small>
            {data.period.start} a {data.period.end}
          </small>
        </article>
        <div className="dashboard-stat-grid">
          <article className="metric">
            <span>Cuentas activas</span>
            <strong>{data.accounts.length}</strong>
          </article>
          <article className="metric">
            <span>Deudas</span>
            <strong>{data.card_debt.length + data.loan_debt.length}</strong>
          </article>
          <article className="metric">
            <span>Presupuestos excedidos</span>
            <strong>
              {data.budgets.filter((item) => Number(item.percentage_used) > 100).length}
            </strong>
          </article>
        </div>
      </section>
      <div className="dashboard-content-grid">
        <div className="dashboard-main">
          {data.recent_transactions.length > 0 ? (
            <CollapsibleCard
              storageKey="dashboard.recent-transactions.open"
              title="Últimos movimientos"
              className="list-card"
            >
              {[...data.recent_transactions]
                .sort((a, b) => {
                  const createdComparison = (b.created_at ?? "").localeCompare(a.created_at ?? "");
                  return createdComparison || b.id - a.id;
                })
                .map((item) => (
                  <div className="list-item" key={`${item.entry_type}-${item.id}`}>
                    <div>
                      <strong>
                        {item.description ||
                          (item.entry_type === "transfer"
                            ? "Transferencia"
                            : item.transaction_type)}
                        {item.entry_type === "transfer" && (
                          <span className="chip">Transferencia</span>
                        )}
                        {item.transaction_type === "payment" && <span className="chip">Pago</span>}
                        {item.is_recurring && <span className="chip">Recurrente</span>}
                        {item.category_id !== null && (
                          <span className="chip category-chip">
                            {categories.data?.find((category) => category.id === item.category_id)
                              ?.name ?? `Categoría #${item.category_id}`}
                          </span>
                        )}
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
          ) : (
            <section className="card">
              <h3>Últimos movimientos</h3>
              <p className="muted">No hay movimientos en este periodo.</p>
            </section>
          )}
        </div>
        <aside className="dashboard-sidebar">
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
          {data.budgets.length > 0 && (
            <CollapsibleCard storageKey="dashboard.budgets.open" title="Presupuestos">
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
        </aside>
      </div>
    </>
  );
}
