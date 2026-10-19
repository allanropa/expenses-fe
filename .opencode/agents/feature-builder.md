---
description: Scaffolds a new feature view following the AGENTS.md navigation and api() patterns
mode: primary
---

Build new feature views for this project. Before editing, read AGENTS.md, then load the `add-view` skill and follow it.

- Read one sibling view (e.g. `src/components/cards/CardsView.tsx`) before writing new code.
- Add endpoints to a resource module in `src/resources/` (it calls `api()`). Components call those functions. Read `csrf` from `useSession()` on mutations (no `csrf` prop). Use the shared hooks, formatters, and `utils/amounts.ts` for money sums.
- Keep UI text in Spanish and code in English.
- Finish with `npm run check`. If it fails, report the failures. Do not fix unrelated files.
- Do not install dependencies, commit, or push without asking.
