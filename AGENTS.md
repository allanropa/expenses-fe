# AGENTS.md

Guidance for AI coding agents working in this repository. Read this before making changes.

## Project overview

Personal finance ("Control" / "Mis finanzas") single-page app: React + TypeScript + Vite.
It talks to a separate backend (`expenses-api`, in its own repo) that runs in Docker.
Views cover accounts, transactions (movimientos), cards, loans, budgets, dashboard, and settings.

- UI copy is **Spanish**. Code identifiers, comments, and commit messages are **English**.
- Keep new user-facing text in Spanish, matching the existing labels (e.g. "Guardar", "Cerrar sesión").

## Commands

| Task | Command |
| --- | --- |
| Install | `npm install` |
| Dev server (http://localhost:5173) | `npm run dev` |
| Type-check | `npm run typecheck` |
| Lint | `npm run lint` (ESLint: typescript-eslint + react-hooks) |
| Format | `npm run format` (Prettier), `npm run format:check` to verify |
| Tests | `npm test` (Vitest, runs once); `npm run test:watch` for watch mode |
| All checks | `npm run check` (typecheck + lint + tests) |
| Production build | `npm run build` (`tsc -b` + `vite build`, outputs `dist/`) |

Before reporting a task as done, run `npm run check` and `npm run build`. `check` covers typecheck, lint, Prettier (`format:check`), and tests. It must pass with no warnings.

## Environment

- `VITE_API_URL` selects the backend. Copy `.env.example` to `.env.local` for local work.
- If unset, `src/api.ts` uses `http://localhost:8000` on localhost, and otherwise derives `expenses-api.<domain>` from the current hostname.
- Vite reads env vars at startup. Restart `npm run dev` after changing them.
- `VITE_*` values are bundled into the public JavaScript. Never put secrets in them.
- `.env`, `.env.local`, and `.env.*.local` are git-ignored. Keep `.env.example` tracked.

## Architecture

```
src/
  main.tsx              Entry point: theme, env check, error boundary, mounts <App />
  App.tsx               App shell: auth gate, SessionProvider, view switching, sidebar/mobile nav, logout
  session.tsx           SessionProvider + useSession() (csrf_token and user)
  env.ts                checkEnv(): validates VITE_API_URL before render
  api.ts                The ONLY fetch wrapper. Base URL resolution, credentials, CSRF, error parsing
  resources/*.ts        One module per backend resource (accountsApi, cardsApi, ...). Only queries.ts calls these
  queries.ts            TanStack Query hooks: a read hook per resource and a write hook per mutation (invalidates related keys)
  queryClient.ts        QueryClient factory (retries, focus refetch)
  types.ts              Shared API types (Session, Account, ...)
  theme.ts, *.css       Theme switching; plain CSS with class names (no Tailwind/CSS-in-JS)
  utils/formatters.ts   money(), periodLabel(), toISODateString()
  utils/amounts.ts      Exact decimal money math: sumAmounts, sumByCurrency, multiplyAmount, isPositiveAmount
  hooks/index.ts        useForm, useModal
  components/
    common/index.tsx    Modal, ActionMenu (shared UI)
    auth/Auth.tsx       Login / registration
    <feature>/<Feature>View.tsx   One folder per feature view
```

### Navigation

`App.tsx` wires views with three things that must stay in sync:
1. The `View` union type
2. The `views` record (`Record<View, ReactNode>`)
3. The `navigation` array (`[View, label][]`, module-level constant)

Adding a view means updating all three.

### Backend endpoints used by the frontend

`/api/auth/session`, `/api/auth/logout`, `/api/accounts` (+ `/:id`, `/:id/movements`, `/:id/balance-adjustments`, `/:id/archive`), and similar routes for cards, loans, budgets, transactions, categories, and settings.
Check the existing call sites or `types.ts` before assuming a shape. The backend lives in a different repo, so do not change API contracts from here. If an endpoint is missing, say so instead of inventing one.

## Coding conventions

### TypeScript and React
- `strict` mode is on. Do not add `any`, `@ts-ignore`, or non-null assertions without a reason. Existing `any` usages (e.g. `movements` in `AccountsView.tsx`) are debt, not a pattern to copy. Add a proper type to `types.ts` instead.
- Use **named exports** for components (`export function AccountsView`).
- Component props are typed with an explicit `interface` or inline type.
- Views and sub-panels that call protected endpoints read the session with `const { csrf_token: csrf } = useSession();` (from `src/session.tsx`). They take no `csrf` prop. Views take no props. `SettingsView` reads `user` from the same hook.
- Hooks start with `use`. Feature views end with `View`. Shared components are PascalCase.
- Never use `dangerouslySetInnerHTML`. React escaping is the default; keep it that way.

### Data fetching and mutations
- **Components do not call `api()` or `fetch`.** Call the resource module for the endpoint, such as `accountsApi.list()` or `cardsApi.recordPayment(csrf, id, body)`. Resource modules live in `src/resources/`, and each one calls `api()` from `src/api.ts`. `api()` handles `credentials: "include"`, the `X-CSRF-Token` header, and error parsing.
- To add an endpoint, add a function to the resource module. Put the `Idempotency-Key` header there for create-style POSTs. Use `src/resources/*.test.ts` to check the method, URL, and headers.
- Pass `csrf` on every mutating request (POST, PATCH, DELETE).
- Load independent data in parallel with `Promise.all`, not sequential awaits.
- Do not load data in `useEffect`. Read with the `useQuery` hooks in `src/queries.ts`. Derive form defaults from query data (a draft state plus the derived value, or a keyed child form), not by copying data into state in an effect.
- Follow the existing `Idempotency-Key` pattern (`crypto.randomUUID()`) for money-moving or create-style POSTs where the backend supports it.
- Write with the `useMutation` hooks in `src/queries.ts`. They invalidate the related keys on success, so there is no manual reload. Close the modal in the mutation's `onSuccess`, and show `mutation.error` inside the modal with `<ErrorMessage>`.

### Error handling
- Do not add new `.catch(() => undefined)`. Show query and mutation errors with `<ErrorMessage error={...} />` from `components/common`. Do not swallow them.
- `api()` throws `Error` with the backend's `detail` message. Use `error.message` for user-facing text.

### Shared utilities and hooks (use these, don't reimplement)
- **Money display:** `money(amount, currency)` from `utils/formatters.ts`. It accepts decimal strings.
- **Money math:** never sum or multiply amounts with `Number()` or floats. Use `utils/amounts.ts`: `sumAmounts([...])`, `sumByCurrency(items, currencyOf, amountOf)`, `multiplyAmount(amount, rate, decimals)`, and `isPositiveAmount(x)` for `> 0` checks. Amounts stay decimal strings end to end, because the API uses decimal strings. Use `Number()` only for IDs.
- **Environment:** `VITE_API_URL` is validated by `checkEnv()` in `src/env.ts`. `main.tsx` shows the error message instead of the app if the value is invalid.
- **Dates:** `toISODateString()` for defaults. Never call `new Date()` inside initial state during render; it changes on every render.
- **Modals:** `useModal()` returns `openModal` / `closeModal`. Pair it with `<Modal open onClose title>`.
- **Forms:** `useForm()` from `hooks/index.ts`. Do not write local form helpers.

### Styling
- Use existing class names in `styles.css` / `theme.css` (`card`, `list-card`, `list-item`, `page-heading`, `eyebrow`, `muted`, `inline-form`, `stack`, `danger-button`, `summary-strip`, ...).
- Colors come from the CSS variables in `theme.css` (light and `[data-theme="dark"]`). Never write a hex or rgb value in `styles.css` or a component. Spacing and radius come from `--space-1..4` and `--radius*`.
- No inline `style={{}}` for static values. Add a class to `styles.css` instead (`mt-2`, `mt-3`, `mt-4`, `mb-2`, `line-*`). The only exceptions are computed widths (budget and dashboard progress bars), which depend on data.
- Keep the mobile layout working (`mobile-top`, `mobile-menu` in `App.tsx`).

### Formatting
- Match the surrounding file's style (2-space indent, double quotes, semicolons). No formatter is configured yet, so don't reformat unrelated code.

## Testing

- Framework: **Vitest**, with `@testing-library/react` and jsdom for DOM tests, and `axe-core` for accessibility checks.
- Node tests (default environment): `src/format.test.ts`, `src/utils/amounts.test.ts`, `src/env.test.ts`, `src/api.test.ts`, and `src/resources/resources.test.ts` (checks each request's method, URL, and headers). `src/theme.contrast.test.ts` checks WCAG contrast (4.5:1) for theme text colors in both themes. It reads `theme.css` with `node:fs`, which is declared in `src/types/node-fs.d.ts` so no `@types/node` is needed.
- DOM tests start with `// @vitest-environment jsdom`. They are `src/hooks/index.test.ts`, `src/components/views.test.tsx` (each view renders, and add buttons open a dialog), `src/components/a11y.test.tsx` (axe on every view and open dialog, plus a negative control), `src/components/common/modal.test.tsx` (focus in, focus return, Tab wrap, focus return after a mouse click in Safari), and `src/components/common/action-menu.test.tsx`. Views are tested with a `QueryClientProvider` (`createQueryClient(false)`).
- New pure logic (formatters, hooks with logic, data transforms) gets tests next to the source file, named `*.test.ts`. New endpoints get a check in `resources.test.ts`. New views get a line in `views.test.tsx` and `a11y.test.tsx`.
- Tests can't check the real layout. For UI changes, run `npm run dev` and check the flow in a browser, or say explicitly that you did not verify it visually.

## Known issues (be aware, don't silently "fix" unrelated)

- **TypeScript is pinned to `^6.0.3`, not 7.x.** `typescript-eslint` 8.x supports TypeScript `<6.1` only. Do not upgrade TypeScript past 6.x until `typescript-eslint` supports it.
- **Lint:** there are no warnings. `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any` are errors. Keep it that way.
- **Add dependencies with `npm install -D <pkg>`.** Use a caret range (`^`) and commit the lockfile change with it. Ask before adding one.
- **Docs:** `README.md` (setup, scripts, Docker) and `AGENTS.md` (this guide) are the only project docs. Do not add refactor reports or change logs; put lasting rules here.
- **`vite.config.ts`** `server.allowedHosts` includes `expenses.lan.rpamplona.com`. Keep it when editing the config.

## Improvements (proposed)

These are recommendations, ordered by priority. Do not start one unless the user asks for it. Several need approval because they add dependencies or change the build.

### P1: Quick wins (done)
Done: scripts (`typecheck`, `lint`, `format`, `format:check`, `test:watch`, `check`), ESLint flat config with typescript-eslint and react-hooks, Prettier with `.prettierrc.json`, `.editorconfig`, `.nvmrc` and `engines` (Node 22), pinned dependency ranges, and a Dockerfile that runs `npm ci` from the lockfile.
Done: `package-lock.json` is committed.

### P2: Reliability and safety
6. ~~**Add a CI workflow**~~ **Skipped by decision.** This is a personal project, so no CI is needed. Do not suggest it again unless the user asks.
7. ~~**Add an error boundary**~~ **Done.** `ErrorBoundary` in `src/components/common/index.tsx` wraps the app root and the current view (`key={view}` resets it on navigation). Errors in event handlers and async code are not caught by it; handle those in the component.
8. ~~**Finance math without floats**~~ **Done (decimal strings, not cents).** The API sends amounts as decimal strings, so amounts stay strings. `utils/amounts.ts` does exact BigInt arithmetic for all totals and payment sums. Switching the API to integer cents would be a backend change; do not do it from the frontend.
9. ~~**Add env validation**~~ **Done.** `checkEnv()` in `src/env.ts` runs before render and rejects a malformed `VITE_API_URL` with a Spanish message. Tests are in `src/env.test.ts`.
10. **Make the API contract explicit.** If the backend publishes an OpenAPI schema, generate types from it (e.g. `openapi-typescript`) instead of hand-writing them in `types.ts`. Remove the remaining `any`s this way.

### P3: Architecture
11. ~~**Split `main.tsx`**~~ **Done.** The shell is in `src/App.tsx`, the navigation is a module-level constant, and `main.tsx` mounts `<App />`.
12. ~~**Add a session context**~~ **Done.** `SessionProvider` and `useSession()` in `src/session.tsx`. Views and sub-panels read `csrf_token` from it, and the `csrf` prop is gone.
13. ~~**Group API calls by resource**~~ **Done.** One module per resource in `src/resources/` (not `src/api/`, because `src/api.ts` already exists). Components call `accountsApi.list()` and similar. The budget and transaction body types are loose (`Record<string, unknown>` for budgets); tighten them with item 10.
14. ~~**Consider TanStack Query**~~ **Done.** Every read is a `useQuery` hook and every write is a `useMutation` hook, both in `src/queries.ts`. Writes invalidate related keys. The session is a query (`keys.session`), and logout clears the other cached data. The `load()` functions and the silent catches are gone.
15. ~~**Lazy-load feature views**~~ **Done.** Each view is a `lazy()` import in `App.tsx`, inside a `Suspense` boundary and the error boundary. Auth loads eagerly. The build emits one chunk per view.
16. ~~**Rename the inconsistent hook API**~~ **Done.** `useModal` returns `openModal` / `closeModal`.

### P4: Testing, accessibility, and polish
17. ~~**Test the infrastructure, not just formatters**~~ **Done.** `api()`, hooks, every resource request, a smoke test per view, and the add dialogs are covered (see Testing). Interaction tests beyond that are still open.
18. ~~**Accessibility pass**~~ **Done for the audited items.** Modals move focus in, return it on close, and trap Tab. Nav marks the current page with `aria-current`. Line-item inputs have accessible names, and the auth error is announced (`role="alert"`). axe reports no violations on any view or open dialog. Color contrast for text is checked by `theme.contrast.test.ts`. Non-text colors (borders, shadows) are not. The `ActionMenu` test covers the click path. The native `<details>` keyboard activation is not simulated in jsdom. Safari focus return is covered by tracking the last pointer target.
19. ~~**Design tokens**~~ **Done for colors and inline styles.** Colors were already tokens. Spacing (`--space-*`) and radius (`--radius*`) tokens were added, and every static inline style became a class. Spacing is tokenized: padding, margin, and gap values that match the scale (`.25`, `.5`, `.75`, `1rem`) use `--space-*`. Other literals (`.35rem`, `1.25rem`, font sizes, widths) are still raw, and changing them needs a browser check. Two light-theme text colors and one dark-theme color were darkened or lightened slightly to pass 4.5:1.
20. ~~**Clean up**~~ **Done.** Deleted `src/main.tsx.bak` and the five refactor docs. `README.md` now has the current setup, scripts, and Docker steps.

## Working agreements for agents

1. **Read before writing.** Look at the feature's existing `*View.tsx`, the relevant `types.ts` entries, and one sibling feature that does something similar.
2. **Keep changes scoped.** One feature or fix per change. Don't refactor unrelated files, rename shared exports, or reformat whole files.
3. **Follow the existing patterns** listed above instead of introducing new libraries or abstractions.
4. **Don't touch the backend contract** from the frontend. Ask if a change needs an API change.
5. **Ask before** deleting files, adding dependencies, changing `package.json` versions, changing Docker/nginx config, or committing.
6. **Never print or commit secrets** (`.env.local`, tokens, CSRF values).
7. **Verify before reporting done:** `npx tsc --noEmit -p .` and `npm test`. Say what you could not verify.
8. **Summarize** what changed, which files, and any follow-ups, in Spanish or English matching the user's message.

## Suggested agent setup (OpenCode)

OpenCode reads this file automatically. The project agents, skill, and permissions are already in the repo. Do not duplicate the built-in `explore` (read-only search, subagent) and `general` (multi-step work, subagent) agents. Use them directly.

### Project agents (in `.opencode/agents/`)

| Agent | Mode | Purpose | Edits allowed |
| --- | --- | --- | --- |
| `reviewer` | subagent | Review diffs against this file: resource modules used instead of `api()` in components, `csrf` on mutations, no new `any`, errors surfaced, shared hooks reused | No |
| `feature-builder` | primary | Scaffold a new view using the `add-view` skill | Yes |
| `test-writer` | subagent | Write Vitest tests for formatters, hooks, and `api()` | Only `src/**/*.test.ts(x)` |
| `api-auditor` | subagent | Compare endpoints used in components with `types.ts` and report mismatches | No |

### Project skill (in `.opencode/skills/`)

- `add-view`: the steps for adding a view (sibling read, types, component using `useSession`, three `App.tsx` edits, `npm run check`). `feature-builder` loads it. Load it directly with `@add-view`.

### Project config (`opencode.jsonc`)

- Asks before `npm install`, `git commit`, `git push`, and `rm`.
- Denies reads of `.env`, `.env.local`, and `.env.*.local`.
- Adds a `/check` command that runs `npm run check`.

The files above are the source of truth. Edit them directly; do not copy their contents into this file.

## Useful prompts for this repo

- "Add a `<feature>` view following the pattern in `AccountsView.tsx`, and register it in `App.tsx`."
- "Find every call site of `/api/accounts` and list which components depend on the response shape."
- "Use the reviewer subagent to review my current changes."
- "Remove the `.catch(() => undefined)` calls in `AccountsView.tsx` and show errors inline instead."
- "Start P2 item 7: add an error boundary around the app root and each view. Ask before creating it."
