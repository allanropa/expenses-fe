import { describe, expect, it } from "vitest";
import { isPositiveAmount, multiplyAmount, sumAmounts, sumByCurrency } from "./amounts";

describe("sumAmounts", () => {
  it("avoids binary floating-point drift", () => {
    expect(sumAmounts(["0.1", "0.2"])).toBe("0.30");
  });

  it("handles negatives and keeps extra precision", () => {
    expect(sumAmounts(["1500.50", "-200.25"])).toBe("1300.25");
    expect(sumAmounts(["0.001", "0.002"])).toBe("0.003");
  });

  it("returns zero with two decimals for empty input", () => {
    expect(sumAmounts([])).toBe("0.00");
  });

  it("treats empty and malformed values as zero", () => {
    expect(sumAmounts(["", "abc", "10", null, undefined, "1e3"])).toBe("10.00");
  });
});

describe("multiplyAmount", () => {
  it("multiplies and rounds to the requested decimals", () => {
    expect(multiplyAmount("1000", "0.0125", 2)).toBe("12.50");
    expect(multiplyAmount("1", "3", 0)).toBe("3");
  });

  it("rounds half away from zero", () => {
    expect(multiplyAmount("10.005", "1", 2)).toBe("10.01");
    expect(multiplyAmount("-10.005", "1", 2)).toBe("-10.01");
  });
});

describe("isPositiveAmount", () => {
  it("is true only for amounts above zero", () => {
    expect(isPositiveAmount("0.01")).toBe(true);
    expect(isPositiveAmount("0.00")).toBe(false);
    expect(isPositiveAmount("-1")).toBe(false);
    expect(isPositiveAmount("")).toBe(false);
  });
});

describe("sumByCurrency", () => {
  it("groups by currency and sums each group exactly", () => {
    const items = [
      { currency: "COP", amount: "1000" },
      { currency: "USD", amount: "0.10" },
      { currency: "COP", amount: "250.5" },
    ];
    expect(
      sumByCurrency(
        items,
        (item) => item.currency,
        (item) => item.amount,
      ),
    ).toEqual({
      COP: "1250.50",
      USD: "0.10",
    });
  });
});
