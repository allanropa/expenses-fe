---
name: Add View
description: Add a new feature view to the expenses frontend, wired into App.tsx navigation, with api() and useSession()
---

## When to use

Use this when the user asks for a new screen or section (e.g. "add a categories view").

## Steps

1. **Read a sibling view.** Pick one with similar behavior, such as `src/components/cards/CardsView.tsx` for a list with a modal form, and read it fully.
2. **Check the types.** Add or confirm the response and request types in `src/types.ts`. Do not use `any`.
3. **Create the component** at `src/components/<feature>/<Feature>View.tsx`:
   - Named export with no props: `export function <Feature>View()`.
   - Read the token first: `const { csrf_token: csrf } = useSession();` (import from `src/session.tsx`). Do not add a `csrf` prop.
   - Load data by calling the resource module (e.g. `accountsApi.list()`) inside `useEffect` with a dependency array. Surface errors to the user; do not use `.catch(() => undefined)`.
   - Mutations also go through the resource module, e.g. `accountsApi.create(csrf, body)`. Add the function to `src/resources/<resource>.ts` if it doesn't exist. It calls `api()` with `{ method, csrf, body: JSON.stringify(...) }`, and it sends `Idempotency-Key` for create-style POSTs.
   - Use `useForm`, `useModal` (`openModal` / `closeModal`), and `Modal` from `src/hooks/index.ts` and `src/components/common`. Use `money()` and `toISODateString()` from `src/utils/formatters.ts`. Sum amounts with `src/utils/amounts.ts`, never with `Number()`.
4. **Register the view in `src/App.tsx`** in all three places:
   - Add the key to the `View` union type.
   - Add an entry to the `views` record as `<Feature>View />` (no props).
   - Add a `[key, "Spanish label"]` entry to the `navigation` array.
5. **Verify:** run `npm run check` (typecheck, lint, test). Fix only errors in files you changed. If the lint errors are pre-existing, say so.
6. **Report:** list the files changed and say what was not verified in a browser.

## Do not

- Add dependencies, change `package.json` versions, or commit without asking.
- Put secrets in `VITE_*` variables.
- Use `dangerouslySetInnerHTML`.
