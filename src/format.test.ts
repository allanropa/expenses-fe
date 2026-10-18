import { describe, expect, it } from "vitest";

describe("financial display", () => {
  it("uses Colombian peso formatting without decimals", () => {
    const output = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(1250000);
    expect(output).toContain("1.250.000");
  });
});
