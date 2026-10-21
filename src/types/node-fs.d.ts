// Minimal typing for the one Node API used by src/theme.contrast.test.ts, so tests can read theme.css without adding @types/node.
declare module "node:fs" {
  export function readFileSync(path: URL, encoding: "utf8"): string;
}
