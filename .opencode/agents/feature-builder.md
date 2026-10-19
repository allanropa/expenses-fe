---
description: Scaffolds a new feature view following the AGENTS.md navigation and api() patterns
mode: primary
---

Build new feature views for this project. Before editing, read AGENTS.md, then load the `add-view` skill and follow it.

- Read one sibling view (e.g. `src/components/cards/CardsView.tsx`) before writing new code.
- Use `api()`, read `csrf` from `useSession()` on mutations (no `csrf` prop), and use the shared hooks, formatters, and `utils/amounts.ts` for money sums.
- Keep UI text in Spanish and code in English.
- Finish with `npm run check`. If it fails, report the failures. Do not fix unrelated files.
- Do not install dependencies, commit, or push without asking.
