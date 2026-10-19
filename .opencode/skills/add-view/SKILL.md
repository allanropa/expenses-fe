---
name: Add View
description: Add a new feature view to the expenses frontend, wired into main.tsx navigation with api() and csrf
---

## When to use

Use this when the user asks for a new screen or section (e.g. "add a categories view").

## Steps

1. **Read a sibling view.** Pick one with similar behavior, such as `src/components/cards/CardsView.tsx` for a list with a modal form, and read it fully.
2. **Check the types.** Add or confirm the response and request types in `src/types.ts`. Do not use `any`.
3. **Create the component** at `src/components/<feature>/<Feature>View.tsx`:
   - Named export: `export function <Feature>View({ csrf }: { csrf: string })`.
   - Load data with `api<T>(path)` inside `useEffect` with a dependency array. Surface errors to the user; do not use `.catch(() => undefined)`.
   - Mutations use `api(path, { method, csrf, body: JSON.stringify(...) })`. Use `Idempotency-Key` for create-style POSTs, as `AccountsView.tsx` does.
   - Use `useForm`, `useModal`, and `Modal` from `src/hooks/index.ts` and `src/components/common`. Use `money()` and `toISODateString()` from `src/utils/formatters.ts`.
4. **Register the view in `src/main.tsx`** in all three places:
   - Add the key to the `View` union type.
   - Add an entry to the `views` record, passing `csrf={activeSession.csrf_token}`.
   - Add a `[key, "Spanish label"]` entry to the `navigation` array.
5. **Verify:** run `npm run check` (typecheck, lint, test). Fix only errors in files you changed. If the lint errors are pre-existing, say so.
6. **Report:** list the files changed and say what was not verified in a browser.

## Do not

- Add dependencies, change `package.json` versions, or commit without asking.
- Put secrets in `VITE_*` variables.
- Use `dangerouslySetInnerHTML`.
