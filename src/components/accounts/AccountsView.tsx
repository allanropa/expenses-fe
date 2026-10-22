import { FormEvent, useState } from "react";
import type { Account } from "../../types";
import { money } from "../../utils/formatters";
import { sumByCurrency } from "../../utils/amounts";
import { toISODateString } from "../../utils/formatters";
import { ActionMenu, ErrorMessage, Modal, PaginationControls } from "../common";
import { useForm, useModal } from "../../hooks";
import {
  useAccount,
  useAccountMovements,
  useAccounts,
  useAdjustAccountBalance,
  useArchiveAccount,
  useCreateAccount,
  useUpdateAccountProfile,
} from "../../queries";

function AccountDetailsContent({ accountId }: { accountId: string }) {
  const account = useAccount(accountId);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const movements = useAccountMovements(accountId, { limit: pageSize, offset: page * pageSize });
  if (account.error) return <ErrorMessage error={account.error} />;
  const detail = account.data;
  if (!detail) return <p className="muted">Cargando...</p>;
  return (
    <section className="card detail-panel">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Detalle</p>
          <h3>{detail.name}</h3>
          <p className="muted">
            {detail.account_type} · {detail.currency}
          </p>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <small>Saldo actual</small>
          <strong>{money(detail.current_balance, detail.currency)}</strong>
        </div>
      </div>
      <h4>Movimientos</h4>
      {movements.error && <ErrorMessage error={movements.error} />}
      {(movements.data ?? []).map((item) => (
        <div className="row" key={item.id}>
          <span>
            {item.effective_date} · {item.operation_type}
            {item.description ? ` · ${item.description}` : ""}
          </span>
          <b>{money(item.amount, item.currency)}</b>
        </div>
      ))}
      <PaginationControls
        page={page}
        pageSize={pageSize}
        itemCount={movements.data?.length ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPage(0);
          setPageSize(nextPageSize);
        }}
      />
    </section>
  );
}

function AccountDetailsPanel({ accountId }: { accountId: string }) {
  const account = useAccount(accountId);
  if (account.error) return <ErrorMessage error={account.error} />;
  if (!account.data) return <p className="muted">Cargando...</p>;
  return <AccountEditor key={account.data.id} account={account.data} />;
}

function AccountEditor({ account }: { account: Account }) {
  const [editName, setEditName] = useState(account.name);
  const [editDesc, setEditDesc] = useState(account.description ?? "");
  const [adjustment, setAdjustment] = useState({
    target_balance: "",
    adjustment_date: toISODateString(),
    description: "",
  });
  const saveProfile = useUpdateAccountProfile();
  const adjustBalance = useAdjustAccountBalance();
  const archive = useArchiveAccount();
  const failure = saveProfile.error ?? adjustBalance.error ?? archive.error;

  function submitProfile(event: FormEvent) {
    event.preventDefault();
    saveProfile.mutate({ id: account.id, body: { name: editName, description: editDesc || null } });
  }

  function submitAdjustment(event: FormEvent) {
    event.preventDefault();
    adjustBalance.mutate(
      { id: account.id, body: adjustment },
      { onSuccess: () => setAdjustment({ ...adjustment, target_balance: "", description: "" }) },
    );
  }

  return (
    <section className="card detail-panel">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Configurar</p>
          <h3>{account.name}</h3>
          <p className="muted">
            {account.account_type} · {account.currency} ·{" "}
            {money(account.current_balance, account.currency)}
          </p>
        </div>
      </div>
      <ErrorMessage error={failure} />
      <h4>Editar cuenta</h4>
      <form className="inline-form" onSubmit={submitProfile}>
        <label>
          Nombre
          <input value={editName} onChange={(event) => setEditName(event.target.value)} />
        </label>
        <label>
          Descripción
          <input value={editDesc} onChange={(event) => setEditDesc(event.target.value)} />
        </label>
        <button>Guardar</button>
      </form>
      <h4>Ajustar saldo</h4>
      <form className="inline-form" onSubmit={submitAdjustment}>
        <label>
          Nuevo saldo
          <input
            required
            type="number"
            step="0.01"
            value={adjustment.target_balance}
            onChange={(event) =>
              setAdjustment({ ...adjustment, target_balance: event.target.value })
            }
          />
        </label>
        <label>
          Fecha
          <input
            required
            type="date"
            value={adjustment.adjustment_date}
            onChange={(event) =>
              setAdjustment({ ...adjustment, adjustment_date: event.target.value })
            }
          />
        </label>
        <label>
          Descripción
          <input
            value={adjustment.description}
            onChange={(event) => setAdjustment({ ...adjustment, description: event.target.value })}
          />
        </label>
        <button>Registrar ajuste</button>
      </form>
      <button
        type="button"
        className="danger-button mt-4"
        onClick={() => archive.mutate(account.id)}
      >
        Archivar cuenta
      </button>
    </section>
  );
}

export function AccountsView() {
  const accounts = useAccounts();
  const createAccount = useCreateAccount();
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

  const list = accounts.data ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    createAccount.mutate(form, {
      onSuccess: () => {
        addModal.closeModal();
        setForm({ ...form, name: "", opening_balance: "0" });
      },
    });
  }

  const totals = sumByCurrency(
    list,
    (account) => account.currency,
    (account) => account.current_balance,
  );

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Liquidez</p>
          <h2>Cuentas</h2>
        </div>
        <button
          onClick={() => {
            createAccount.reset();
            addModal.openModal();
          }}
        >
          Agregar cuenta
        </button>
      </header>

      <section className="summary-strip">
        <strong>{list.length} cuentas</strong>
        {Object.entries(totals).map(([currency, amount]) => (
          <span key={currency}>
            {currency}: {money(amount, currency)}
          </span>
        ))}
      </section>

      <section className="card list-card">
        <ErrorMessage error={accounts.error} />
        {accounts.isPending && !accounts.error ? (
          <p className="muted">Cargando cuentas...</p>
        ) : list.length === 0 && !accounts.error ? (
          <p className="muted">No hay cuentas registradas.</p>
        ) : (
          list.map((account) => (
            <div className="list-item" key={account.id}>
              <div>
                <strong>{account.name}</strong>
                <small>
                  {account.account_type} · {account.currency}
                </small>
              </div>
              <b>{money(account.current_balance, account.currency)}</b>
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

      <Modal open={addModal.open} title="Agregar cuenta" onClose={() => addModal.closeModal()}>
        <form className="stack" onSubmit={submit}>
          <ErrorMessage error={createAccount.error} />
          <label>
            Nombre
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
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
        {detailId !== null && <AccountDetailsContent accountId={String(detailId)} />}
      </Modal>

      <Modal
        open={configModal.open}
        title="Configurar cuenta"
        onClose={() => configModal.closeModal()}
      >
        {configId !== null && <AccountDetailsPanel accountId={String(configId)} />}
      </Modal>
    </>
  );
}
