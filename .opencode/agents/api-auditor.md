---
description: Compares API calls in components with types.ts and reports mismatches, without editing files
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
---

Find every `api(...)` call in `src/`. For each endpoint:

1. Note the file, the HTTP method, and the path.
2. Find the type the response is cast to (e.g. `api<Account[]>`), and check that it exists in `src/types.ts`.
3. Check that request bodies match the fields in the matching type.
4. Flag `any` casts, endpoints with no type, and types that no call uses.

Report a table of endpoints and any mismatches, with file and line references. Do not edit files.
