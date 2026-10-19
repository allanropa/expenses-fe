import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

const jsonHeaders = { "Content-Type": "application/json" };

beforeEach(() => {
  vi.stubGlobal("window", { location: { hostname: "localhost", protocol: "http:" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(response: Response) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("api", () => {
  it("parses JSON on success", async () => {
    mockFetch(new Response(JSON.stringify({ id: 1 }), { status: 200, headers: jsonHeaders }));
    expect(await api<{ id: number }>("/api/x")).toEqual({ id: 1 });
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch(new Response(null, { status: 204 }));
    expect(await api("/api/x")).toBeUndefined();
  });

  it("throws the backend detail message on error", async () => {
    mockFetch(
      new Response(JSON.stringify({ detail: "Saldo insuficiente" }), {
        status: 400,
        headers: jsonHeaders,
      }),
    );
    await expect(api("/api/x")).rejects.toThrow("Saldo insuficiente");
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    mockFetch(new Response("boom", { status: 500 }));
    await expect(api("/api/x")).rejects.toThrow("No fue posible completar la solicitud.");
  });

  it("sends the CSRF token, JSON content type, and credentials with a body", async () => {
    const fetchMock = mockFetch(new Response("{}", { status: 200, headers: jsonHeaders }));
    await api("/api/x", { method: "POST", csrf: "tok", body: "{}" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBe("tok");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.credentials).toBe("include");
  });
});
