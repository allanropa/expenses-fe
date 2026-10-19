/**
 * Exact decimal arithmetic for money amounts.
 *
 * The API sends amounts as decimal strings (e.g. "1500.50"). Summing them with
 * Number() drifts (0.1 + 0.2 !== 0.3), so these helpers work on BigInt units
 * and only convert back to a string at the end. Malformed or empty input counts as zero.
 */

const DECIMAL = /^[+-]?\d+(\.\d+)?$/;

type Decimal = { units: bigint; scale: number };

function parseDecimal(value: string | null | undefined): Decimal {
  const text = value?.trim() ?? "";
  if (!DECIMAL.test(text)) return { units: 0n, scale: 0 };
  const [whole, fraction = ""] = text.replace(/^[+-]/, "").split(".");
  const magnitude = BigInt(whole + fraction);
  return { units: text.startsWith("-") ? -magnitude : magnitude, scale: fraction.length };
}

function formatDecimal(units: bigint, scale: number): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);
  const body = scale > 0 ? `${whole}.${fraction}` : whole;
  return negative ? `-${body}` : body;
}

function rescale(units: bigint, from: number, to: number): bigint {
  if (from <= to) return units * 10n ** BigInt(to - from);
  const divisor = 10n ** BigInt(from - to);
  const negative = units < 0n;
  const magnitude = negative ? -units : units;
  const rounded = (magnitude + divisor / 2n) / divisor;
  return negative ? -rounded : rounded;
}

/** Exact sum of decimal amounts. Result has at least 2 decimal places. */
export function sumAmounts(values: ReadonlyArray<string | null | undefined>): string {
  const parsed = values.map(parseDecimal);
  const scale = Math.max(2, ...parsed.map((item) => item.scale));
  const units = parsed.reduce((total, item) => total + rescale(item.units, item.scale, scale), 0n);
  return formatDecimal(units, scale);
}

/** Multiply an amount by a rate and round half-up to `decimals` places. */
export function multiplyAmount(amount: string, rate: string, decimals: number): string {
  const a = parseDecimal(amount);
  const b = parseDecimal(rate);
  return formatDecimal(rescale(a.units * b.units, a.scale + b.scale, decimals), decimals);
}

/** True only for amounts strictly greater than zero. */
export function isPositiveAmount(value: string | null | undefined): boolean {
  return parseDecimal(value).units > 0n;
}

/** Group items by currency and sum their amounts exactly. */
export function sumByCurrency<T>(
  items: ReadonlyArray<T>,
  currencyOf: (item: T) => string,
  amountOf: (item: T) => string | null | undefined,
): Record<string, string> {
  const groups: Record<string, string[]> = {};
  for (const item of items) {
    (groups[currencyOf(item)] ??= []).push(amountOf(item) ?? "");
  }
  return Object.fromEntries(
    Object.entries(groups).map(([currency, amounts]) => [currency, sumAmounts(amounts)]),
  );
}
