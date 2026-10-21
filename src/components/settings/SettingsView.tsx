import { FormEvent, useState } from "react";
import { ErrorMessage } from "../common";
import { useSettings, useUpdateProfile, useUpdateSettings } from "../../queries";
import { getInitialTheme, applyTheme, type Theme } from "../../theme";
import { useSession } from "../../session";

export function SettingsView() {
  const { user } = useSession();
  const settings = useSettings();
  const saveProfile = useUpdateProfile();
  const saveSettings = useUpdateSettings();
  const [name, setName] = useState(user.display_name);
  const [draft, setDraft] = useState<{ currency?: string; timezone?: string }>({});
  const [theme, setTheme] = useState<Theme>(getInitialTheme());
  const currency = draft.currency ?? settings.data?.reporting_currency ?? "COP";
  const timezone = draft.timezone ?? settings.data?.timezone ?? "America/Bogota";
  const setCurrency = (value: string) => setDraft((prev) => ({ ...prev, currency: value }));
  const setTimezone = (value: string) => setDraft((prev) => ({ ...prev, timezone: value }));

  function save(event: FormEvent) {
    event.preventDefault();
    saveProfile.mutate({ display_name: name });
    saveSettings.mutate({ reporting_currency: currency, timezone });
  }

  return (
    <section className="card">
      <p className="eyebrow">Perfil</p>
      <h2>Configuración</h2>
      <p className="muted">{user.email}</p>

      <ErrorMessage error={settings.error ?? saveProfile.error ?? saveSettings.error} />
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
    </section>
  );
}
