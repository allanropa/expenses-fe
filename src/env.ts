export type EnvCheck = { ok: true } | { ok: false; message: string };

/**
 * Validate build-time environment variables before the app starts.
 * An unset or empty VITE_API_URL is valid: src/api.ts derives the URL at runtime.
 */
export function checkEnv(env: { VITE_API_URL?: string }): EnvCheck {
  const apiUrl = env.VITE_API_URL?.trim();
  if (!apiUrl) return { ok: true };

  const fail = (reason: string): EnvCheck => ({
    ok: false,
    message: `VITE_API_URL no es válida (${reason}): "${apiUrl}". Revisa .env.local o el build-arg de Docker.`,
  });

  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    return fail("no es una URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("debe empezar con http:// o https://");
  }
  if (url.search || url.hash) {
    return fail("no debe incluir parámetros ni #");
  }
  if (apiUrl.endsWith("/")) {
    return fail("no debe terminar en /, porque las rutas empiezan con /api");
  }
  return { ok: true };
}
