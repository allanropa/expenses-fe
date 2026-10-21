import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const css = readFileSync(new URL("./theme.css", import.meta.url), "utf8");

function tokens(selector: RegExp): Record<string, string> {
  const block = css.match(selector);
  if (!block) throw new Error("theme block not found");
  const out: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[name] = value;
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = {
  light: tokens(/:root\s*{([^}]*)}/),
  dark: tokens(/\[data-theme="dark"\]\s*{([^}]*)}/),
};

const textPairs: [string, string][] = [
  ["text", "bg"],
  ["text", "surface"],
  ["text", "surface-2"],
  ["text-muted", "bg"],
  ["text-muted", "surface"],
  ["text-muted", "surface-2"],
  ["text-faint", "bg"],
  ["text-faint", "surface"],
  ["text-faint", "surface-2"],
  ["text-label", "surface"],
  ["accent", "surface"],
  ["accent-wash-text", "accent-wash"],
  ["error", "error-wash"],
  ["negative", "surface"],
  ["positive", "surface"],
  ["sidebar-text", "sidebar-bg"],
  ["sidebar-muted", "sidebar-bg"],
];

describe("theme text colors meet WCAG AA (4.5:1)", () => {
  for (const [name, palette] of Object.entries(themes)) {
    it.each(textPairs)(`${name}: %s on %s`, (fg, bg) => {
      expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
