import { describe, expect, it } from "vitest";
import { checkEnv } from "./env";

describe("checkEnv", () => {
  it("accepts an unset or empty API URL", () => {
    expect(checkEnv({})).toEqual({ ok: true });
    expect(checkEnv({ VITE_API_URL: "" })).toEqual({ ok: true });
    expect(checkEnv({ VITE_API_URL: "   " })).toEqual({ ok: true });
  });

  it("accepts http and https URLs with no trailing slash", () => {
    expect(checkEnv({ VITE_API_URL: "http://localhost:8000" })).toEqual({ ok: true });
    expect(checkEnv({ VITE_API_URL: "https://expenses-api.lan.rpamplona.com" })).toEqual({
      ok: true,
    });
  });

  it("rejects values that are not URLs", () => {
    expect(checkEnv({ VITE_API_URL: "not a url" }).ok).toBe(false);
  });

  it("rejects non-http protocols, including a bare host:port", () => {
    expect(checkEnv({ VITE_API_URL: "localhost:8000" }).ok).toBe(false);
    expect(checkEnv({ VITE_API_URL: "ftp://example.com" }).ok).toBe(false);
  });

  it("rejects a trailing slash, since api() appends /api paths", () => {
    const result = checkEnv({ VITE_API_URL: "http://localhost:8000/" });
    expect(result.ok).toBe(false);
  });

  it("rejects query strings and fragments", () => {
    expect(checkEnv({ VITE_API_URL: "http://localhost:8000?x=1" }).ok).toBe(false);
    expect(checkEnv({ VITE_API_URL: "http://localhost:8000#top" }).ok).toBe(false);
  });
});
