import { FormEvent, useState } from "react";
import { authApi } from "../../resources/auth";
import type { Session } from "../../types";
import { useForm } from "../../hooks";

interface AuthProps {
  onSession: (session: Session) => void;
}

export function Auth({ onSession }: AuthProps) {
  const [registering, setRegistering] = useState(false);
  const { form, setForm } = useForm({
    email: "",
    password: "",
    display_name: "",
  });
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const session: Session = await (registering ? authApi.register(form) : authApi.login(form));
      onSession(session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error de autenticación");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Mis finanzas</p>
        <h1>{registering ? "Crea tu espacio financiero" : "Vuelve a tus números"}</h1>
        <p className="muted">Una vista clara de tu dinero, tus obligaciones y tus hábitos.</p>
        <form onSubmit={submit} className="stack">
          {registering && (
            <label>
              Nombre
              <input
                required
                value={form.display_name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    display_name: event.target.value,
                  })
                }
              />
            </label>
          )}
          <label>
            Correo
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Contraseña
            <input
              required
              minLength={8}
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button>{registering ? "Crear cuenta" : "Iniciar sesión"}</button>
        </form>
        <button className="link-button" onClick={() => setRegistering(!registering)}>
          {registering ? "Ya tengo una cuenta" : "Crear una cuenta"}
        </button>
      </section>
    </main>
  );
}
