---
description: Reviews changes against AGENTS.md conventions without editing files
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "git diff*"
    effect: allow
  - action: shell
    resource: "git status*"
    effect: allow
  - action: shell
    resource: "git log*"
    effect: allow
---

Review the current changes against AGENTS.md. Use `git status` and `git diff` to see them.

Check that:
- Components call resource modules in `src/resources/`, not `api()` or `fetch` directly.
- `csrf` comes from `useSession()` and is sent on every mutating request. No `csrf` prop.
- No new `any`, `@ts-ignore`, or non-null assertion was added without a reason.
- Errors are not silently swallowed (`.catch(() => undefined)`).
- Shared hooks and formatters are reused instead of local copies.
- User-facing text is Spanish, and code identifiers are English.

List findings in severity order with file and line references. Do not edit files.
