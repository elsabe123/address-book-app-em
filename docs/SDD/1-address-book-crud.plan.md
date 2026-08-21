# Implementation Plan: Build a full-stack Address Book with CRUD functionality

- **Ticket:** [#1](https://github.com/elsabe123/address-book-app-em/issues/1)
- **Spec:** [1-address-book-crud.spec.md](./1-address-book-crud.spec.md) (approved)
- **Status:** Draft — awaiting approval (Gate B)
- **Branch:** `feature/address-book-crud`

## 1. Repo Layout

Monorepo, two top-level apps, no shared package manager workspace needed for
this scope:

```
address_book_app_em/
├── backend/
│   ├── src/
│   │   ├── data/
│   │   │   └── store.js         # JSON file read/write, atomic writes, mutex
│   │   ├── models/
│   │   │   └── contact.js       # validation logic (shared regexes/limits)
│   │   ├── routes/
│   │   │   └── contacts.js      # Express router: 5 endpoints
│   │   ├── middleware/
│   │   │   └── errorHandler.js  # centralized error -> HTTP status mapping
│   │   ├── app.js               # Express app assembly (no listen())
│   │   └── server.js            # listen() entrypoint
│   ├── data/
│   │   └── contacts.json        # runtime data file (gitignored, seeded empty on first run)
│   ├── test/
│   │   ├── contact.model.test.js
│   │   └── contacts.routes.test.js
│   ├── package.json
│   └── vitest.config.js
└── frontend/
    └── (generated via `ng new frontend --standalone --style=scss --routing`)
        src/app/
        ├── contacts/
        │   ├── contact.model.ts
        │   ├── contact.service.ts
        │   ├── contacts-list/
        │   ├── contact-form/          # shared by add + edit
        │   └── confirm-dialog/
        ├── app.routes.ts
        └── app.config.ts
```

## 2. Build Order

1. **Backend scaffold** — `package.json`, Express, dependencies (`express`,
   `uuid`, `cors`); dev deps (`vitest`, `supertest`, `nodemon`).
2. **Data store module** (`store.js`) — read/write JSON with atomic
   temp-file-then-rename, `Map`-based mutex around writes to serialize
   concurrent requests.
3. **Contact model/validation** (`contact.js`) — pure functions:
   `validateContact(input, {partial})`, exported regexes/limits (incl. the
   new `notes` 80-char rule) as the single source of truth referenced by
   both this module and the spec.
4. **Routes** (`contacts.js`) — implement GET list (+ `search`), GET by id,
   POST, PUT, DELETE, wired to store + validation.
5. **Error handling middleware** — maps validation errors → 400, not-found →
   404, unexpected → 500 with generic message.
6. **App/server split** — `app.js` exports the configured app (for
   Supertest to import without binding a port); `server.js` calls `.listen()`.
7. **Backend tests** — unit tests for `contact.js` validation rules;
   integration tests for all 5 routes via Supertest against a temp data file.
8. **Frontend scaffold** — `ng new frontend --standalone --style=scss
   --routing`, add `@angular/material` via `ng add`.
9. **Contact model + service** — `contact.model.ts` (mirrors backend shape
   incl. `notes`), `contact.service.ts` (HttpClient wrapper for the 5 endpoints).
10. **Contacts list component** — table, search box (debounced via RxJS),
    loading/error states, delete button wired to confirm dialog.
11. **Confirm dialog component** — `MatDialog`-based reusable yes/no.
12. **Contact form component** — reactive form shared by add/edit routes,
    client-side validators mirroring backend rules (incl. `notes` maxlength
    80 with live counter), loading/error state on submit.
13. **Routing** — `/contacts`, `/contacts/new`, `/contacts/:id/edit`
    (`app.routes.ts`), default redirect `/` → `/contacts`.
14. **Frontend tests** — component specs per acceptance-criteria mapping
    in the spec (list renders, form validation, dialog confirm flow).
15. **Root-level scripts** — top-level `README.md` update with run
    instructions for both apps (`npm run dev` per folder); no root package.json
    needed (two independent apps, kept simple for this scope).

## 3. Data / Migrations

No database — no migrations. `backend/data/contacts.json` is created
empty (`[]`) on first run if missing; the file itself is `.gitignore`d
(runtime data, not source) with a `contacts.json.example` committed for
reference.

## 4. Test Plan

Per spec §7, executed as:
- **Unit (backend):** `contact.model.test.js` — one case per validation rule,
  including the new `notes` max-80 rule (79/80/81 char boundary cases).
- **Integration (backend):** `contacts.routes.test.js` — full CRUD lifecycle
  against a real (temp, isolated) JSON file: create → read → update → search
  → delete → 404 after delete → restart-simulated re-read from disk (proves
  persistence).
- **Unit (frontend):** form validator specs, contact.service specs (HttpClient
  mocked via `HttpTestingController`).
- **Component (frontend):** contacts-list renders rows / empty state; confirm
  dialog fires delete only on confirm; form pre-populates on edit.
- E2E: none for this iteration (per spec §6, out of scope).

Run commands:
```bash
cd backend && npm test
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless
```

## 5. Risks (carried from spec §8) + Build-Time Additions

| Risk | Mitigation |
|---|---|
| JSON file corruption on crash mid-write | Temp-file + atomic rename in `store.js` |
| Concurrent writes racing | In-process async mutex serializing all writes |
| Client/server validation drift | Limits/regexes documented once in spec §3, referenced by both `contact.js` and Angular validators — not redefined ad hoc |
| Angular Material version mismatch with Angular 17+ | Use `ng add @angular/material` (resolves compatible version automatically) rather than manual install |
| Empty repo → first commits are large | Single feature branch, but will land as one reviewable PR per plan scope (this is a training project, not split into multiple PRs) |

## 6. Rollback Plan

- All work happens on `feature/address-book-crud`, branched from `main`.
- `main` remains untouched (currently just README/LICENSE/.gitignore/.dev-its)
  until the PR is merged — rollback pre-merge is simply: do not merge / close PR.
- Post-merge rollback: `git revert <merge-commit-sha>` on `main` (no
  migrations to reverse, no schema to downgrade — JSON-file data model only).
- No deployment/infra changes in this iteration, so no external rollback steps
  (no DB, no cloud resources) are required.

## 7. Open Questions

None.
