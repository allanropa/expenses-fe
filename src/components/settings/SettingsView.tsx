import { useEffect, useState, FormEvent } from "react";
import { authApi } from "../../resources/auth";
import { settingsApi } from "../../resources/settings";
import { getInitialTheme, applyTheme, type Theme } from "../../theme";
import { useSession } from "../../session";

export function SettingsView() {
  const { csrf_token: csrf, user } = useSession();
  const [name, setName] = useState(user.display_name);
  const [currency, setCurrency] = useState("COP");
  const [timezone, setTimezone] = useState("America/Bogota");
  const [theme, setTheme] = useState<Theme>(getInitialTheme());

  // Fixed: Proper loading of initial settings
  useEffect(() => {
    settingsApi.get()
      .then((data) => {
        setCurrency(data.reporting_currency);
        setTimezone(data.timezone);
      })
      .catch(() => {
        // Use defaults
      });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();

    // Save profile and settings in parallel
    await Promise.all([
      authApi.updateProfile(csrf, { display_name: name }),
      settingsApi.update(csrf, { reporting_currency: currency, timezone }),
    ]);
  }

  return (
    <section className="card">
      <p className="eyebrow">Perfil</p>
      <h2>Configuración</h2>
      <p className="muted">{user.email}</p>

      <form className="stack settings-form" onSubmit={save}>
        <label>
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label>
          Moneda de reportes
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            <option>COP</option>
            <option>USD</option>
          </select>
        </label>

        <label>
          Zona horaria
          <input
            value={timezone}
            onChange={(event) =>
              setTimezone(event.target.value)
            }
          />
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
