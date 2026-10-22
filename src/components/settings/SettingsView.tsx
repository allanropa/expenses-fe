import { FormEvent, useState } from "react";
import { ErrorMessage } from "../common";
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useSettings,
  useUpdateProfile,
  useUpdateSettings,
} from "../../queries";
import { getInitialTheme, applyTheme, type Theme } from "../../theme";
import { useSession } from "../../session";
import { useForm } from "../../hooks";
import type { CategoryKind } from "../../types";

export function SettingsView() {
  const { user } = useSession();
  const settings = useSettings();
  const saveProfile = useUpdateProfile();
  const saveSettings = useUpdateSettings();
  const categories = useCategories();
  const createCategory = useCreateCategory();
  const archiveCategory = useArchiveCategory();
  const [name, setName] = useState(user.display_name);
  const [draft, setDraft] = useState<{ currency?: string; timezone?: string }>({});
  const [theme, setTheme] = useState<Theme>(getInitialTheme());
  const categoryForm = useForm<{ name: string; kind: CategoryKind }>({ name: "", kind: "expense" });
  const currency = draft.currency ?? settings.data?.reporting_currency ?? "COP";
  const timezone = draft.timezone ?? settings.data?.timezone ?? "America/Bogota";
  const setCurrency = (value: string) => setDraft((prev) => ({ ...prev, currency: value }));
  const setTimezone = (value: string) => setDraft((prev) => ({ ...prev, timezone: value }));

  function save(event: FormEvent) {
    event.preventDefault();
    saveProfile.mutate({ display_name: name });
    saveSettings.mutate({ reporting_currency: currency, timezone });
  }

  function addCategory(event: FormEvent) {
    event.preventDefault();
    createCategory.mutate(categoryForm.form, {
      onSuccess: () => categoryForm.setForm({ name: "", kind: "expense" }),
    });
  }

  return (
    <section className="card">
      <p className="eyebrow">Perfil</p>
      <h2>Configuración</h2>
      <p className="muted">{user.email}</p>

      <ErrorMessage
        error={
          settings.error ??
          saveProfile.error ??
          saveSettings.error ??
          categories.error ??
          createCategory.error ??
          archiveCategory.error
        }
      />
      <form className="stack settings-form" onSubmit={save}>
        <label>
          Nombre
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label>
          Moneda de reportes
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            <option>COP</option>
            <option>USD</option>
          </select>
        </label>

        <label>
          Zona horaria
          <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        </label>

        <label>
          Tema
          <select
            value={theme}
            onChange={(event) => {
              const value = event.target.value as Theme;
              setTheme(value);
              applyTheme(value);
            }}
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>

        <button>Guardar cambios</button>
      </form>

      <div className="settings-section">
        <p className="eyebrow">Clasificación</p>
        <h3>Categorías</h3>
        <p className="muted">
          Las categorías iniciales se crean automáticamente. Puedes agregar las tuyas.
        </p>

        <form className="inline-form" onSubmit={addCategory}>
          <label>
            Nombre
            <input
              required
              maxLength={80}
              value={categoryForm.form.name}
              onChange={(event) =>
                categoryForm.setForm((previous) => ({ ...previous, name: event.target.value }))
              }
            />
          </label>
          <label>
            Tipo
            <select
              value={categoryForm.form.kind}
              onChange={(event) =>
                categoryForm.setForm((previous) => ({
                  ...previous,
                  kind: event.target.value as CategoryKind,
                }))
              }
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
              <option value="both">Ambos</option>
            </select>
          </label>
          <button disabled={createCategory.isPending}>Agregar categoría</button>
        </form>

        <div className="list-card">
          {categories.data?.map((category) => (
            <div className="list-item" key={category.id}>
              <div>
                <strong>{category.name}</strong>
                <small>
                  {category.kind === "expense"
                    ? "Gasto"
                    : category.kind === "income"
                      ? "Ingreso"
                      : "Ingreso y gasto"}
                </small>
              </div>
              <button
                className="danger-button"
                type="button"
                disabled={archiveCategory.isPending}
                onClick={() => archiveCategory.mutate(category.id)}
              >
                Archivar
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
