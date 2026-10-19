import { FormEvent, useEffect, useState } from "react";
import { accountsApi } from "../../resources/accounts";
import type { Account, AccountMovement } from "../../types";
import { money } from "../../utils/formatters";
import { sumByCurrency } from "../../utils/amounts";
import { toISODateString } from "../../utils/formatters";
import { Modal, ActionMenu } from "../common";
import { useForm, useModal } from "../../hooks";
import { useSession } from "../../session";

interface AccountDetailsContentProps {
  initialId: string;
}

function AccountDetailsContent({ initialId }: AccountDetailsContentProps) {
  const [detail, setDetail] = useState<Account | null>(null);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  useEffect(() => {
    accountsApi.get(initialId).then(setDetail).catch(() => undefined);
    accountsApi.movements(initialId).then(setMovements).catch(() => undefined);
  }, [initialId]);
  return (
    <section className="card detail-panel">
      {detail && (
        <>
          <div className="detail-heading">
            <div>
              <p className="eyebrow">Detalle</p>
              <h3>{detail.name}</h3>
              <p className="muted">{detail.account_type} · {detail.currency}</p>
            </div>
          </div>
          <div className="detail-grid">
            <div><small>Saldo actual</small><strong>{money(detail.current_balance, detail.currency)}</strong></div>
          </div>
          <h4>Movimientos</h4>
          {movements.slice(0, 12).map((item) => (
            <div className="row" key={item.id}>
              <span>{item.effective_date} · {item.operation_type}{item.description ? ` · ${item.description}` : ""}</span>
              <b>{money(item.amount, item.currency)}</b>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

interface AccountDetailsPanelProps {
  initialId?: string;
  onChanged: () => void;
}

function AccountDetailsPanel({
  initialId,
  onChanged,
}: AccountDetailsPanelProps) {
  const { csrf_token: csrf } = useSession();
  const [accountId, setAccountId] = useState(initialId ?? "");
  const [detail, setDetail] = useState<Account | null>(null);
  const [form, setForm] = useState({
    target_balance: "",
    adjustment_date: toISODateString(),
    description: "",
  });
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  useEffect(() => {
    if (!initialId) return;
    setAccountId(initialId);
    accountsApi.get(initialId).then((value) => {
      setDetail(value);
      setEditName(value.name);
      setEditDesc(value.description ?? "");
    }).catch(() => undefined);
  }, [initialId]);
  async function adjust(event: FormEvent) {
    event.preventDefault();
    if (!accountId) return;
    await accountsApi.adjustBalance(csrf, accountId, form);
    setForm({ ...form, target_balance: "", description: "" });
    const updated = await accountsApi.get(accountId);
    setDetail(updated);
    setEditName(updated.name);
    setEditDesc(updated.description ?? "");
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();

    await accountsApi.updateProfile(csrf, accountId, {
      name: editName,
      description: editDesc || null,
    });

    const updated = await accountsApi.get(accountId);
    setDetail(updated);
    setEditName(updated.name);
    setEditDesc(updated.description ?? "");

    onChanged();
  }

  async function archive() {
    await accountsApi.archive(csrf, accountId);
    onChanged();
  }

  return (
    <section className="card detail-panel">
      {detail && (
        <>
          <div className="detail-heading">
            <div>
              <p className="eyebrow">Configurar</p>
              <h3>{detail.name}</h3>
              <p className="muted">{detail.account_type} · {detail.currency} · {money(detail.current_balance, detail.currency)}</p>
            </div>
          </div>
          <h4>Editar cuenta</h4>
          <form className="inline-form" onSubmit={saveProfile}>
            <label>Nombre<input value={editName} onChange={(event) => setEditName(event.target.value)} /></label>
            <label>Descripción<input value={editDesc} onChange={(event) => setEditDesc(event.target.value)} /></label>
            <button>Guardar</button>
          </form>
          <h4>Ajustar saldo</h4>
          <form className="inline-form" onSubmit={adjust}>
            <label>Nuevo saldo<input required type="number" step="0.01" value={form.target_balance} onChange={(event) => setForm({ ...form, target_balance: event.target.value })} /></label>
            <label>Fecha<input required type="date" value={form.adjustment_date} onChange={(event) => setForm({ ...form, adjustment_date: event.target.value })} /></label>
            <label>Descripción<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <button>Registrar ajuste</button>
          </form>
          <button type="button" className="danger-button" onClick={archive} style={{ marginTop: 16 }}>Archivar cuenta</button>
        </>
      )}
    </section>
  );
}

export function AccountsView() {
  const { csrf_token: csrf } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const addModal = useModal();
  const detailModal = useModal();
  const configModal = useModal();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [configId, setConfigId] = useState<number | null>(null);
  const { form, setForm } = useForm({
    name: "",
    currency: "COP",
    account_type: "checking",
    opening_balance: "0",
    opening_balance_date: toISODateString(),
  });

  const load = () => accountsApi.list().then(setAccounts).catch(() => undefined);

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await accountsApi.create(csrf, form);
    addModal.closeModal();
    setForm({ ...form, name: "", opening_balance: "0" });
    load();
  }

  const totals = sumByCurrency(
    accounts,
    (account) => account.currency,
    (account) => account.current_balance
  );

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Liquidez</p>
          <h2>Cuentas</h2>
        </div>
        <button onClick={() => addModal.openModal()}>
          Agregar cuenta
        </button>
      </header>

      <section className="summary-strip">
        <strong>{accounts.length} cuentas</strong>
        {Object.entries(totals).map(([currency, amount]) => (
          <span key={currency}>
            {currency}: {money(amount, currency)}
          </span>
        ))}
      </section>

      <section className="card list-card">
        {accounts.length === 0 ? (
          <p className="muted">No hay cuentas registradas.</p>
        ) : (
          accounts.map((account) => (
            <div className="list-item" key={account.id}>
              <div>
                <strong>{account.name}</strong>
                <small>
                  {account.account_type} · {account.currency}
                </small>
              </div>
              <b>
                {money(
                  account.current_balance,
                  account.currency
                )}
              </b>
              <ActionMenu
                onDetails={() => {
                  setDetailId(account.id);
                  detailModal.openModal();
                }}
                onConfigure={() => {
                  setConfigId(account.id);
                  configModal.openModal();
                }}
              />
            </div>
          ))
        )}
      </section>

      <Modal
        open={addModal.open}
        title="Agregar cuenta"
        onClose={() => addModal.closeModal()}
      >
        <form className="stack" onSubmit={submit}>
          <label>
            Nombre
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            Tipo
            <select
              value={form.account_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  account_type: event.target.value,
                })
              }
            >
              <option value="checking">Corriente</option>
              <option value="savings">Ahorros</option>
              <option value="cash">Efectivo</option>
            </select>
          </label>
          <label>
            Moneda
            <select
              value={form.currency}
              onChange={(event) =>
                setForm({
                  ...form,
                  currency: event.target.value,
                })
              }
            >
              <option>COP</option>
              <option>USD</option>
            </select>
          </label>
          <button>Guardar cuenta</button>
        </form>
      </Modal>

      <Modal
        open={detailModal.open}
        title="Detalle de cuenta"
        onClose={() => detailModal.closeModal()}
      >
        {detailId !== null && <AccountDetailsContent initialId={String(detailId)} />}
      </Modal>

      <Modal
        open={configModal.open}
        title="Configurar cuenta"
        onClose={() => configModal.closeModal()}
      >
        {configId !== null && (
          <AccountDetailsPanel
            initialId={String(configId)}
            onChanged={load}
          />
        )}
      </Modal>
    </>
  );
}
