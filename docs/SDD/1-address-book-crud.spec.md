# Spec: Build a full-stack Address Book with CRUD functionality

- **Ticket:** [#1](https://github.com/elsabe123/address-book-app-em/issues/1)
- **Status:** Draft — awaiting approval (Gate A)
- **Complexity:** HIGH (19/21)

## 1. Summary

A full-stack Address Book application: an Express REST API backed by a JSON
file data store, and an Angular 17+ standalone-components frontend, allowing
a user to create, view, search, edit, and delete contacts.

## 2. Decisions (resolved from ticket's either/or choices)

| Choice | Decision | Rationale |
|---|---|---|
| Backend | Node.js + Express | Single language (TS/JS) across stack, pairs naturally with Angular/npm tooling |
| Storage | JSON file (`data/contacts.json`) | Simplest option; no external DB server; fits training-project scope |
| Frontend styling | Angular Material | Modern, accessible, built-in responsive components |
| Backend test framework | Vitest + Supertest | Fast, ESM-friendly, good for API integration tests |
| Frontend test framework | Jasmine/Karma (Angular CLI default) | Ships with Angular CLI, no extra setup |

## 3. Data Model

```ts
interface Contact {
  id: string;          // UUID v4, server-generated
  firstName: string;   // required, 1-50 chars
  lastName: string;    // required, 1-50 chars
  cellNumber: string;  // required, E.164-ish phone format
  email: string;       // required, valid email format
  notes?: string;      // optional, free text, max 80 chars
  createdAt: string;   // ISO 8601, server-set on create
  updatedAt: string;   // ISO 8601, server-set on create and update
}
```

Validation rules:
- `firstName`, `lastName`: non-empty after trim, max 50 chars
- `cellNumber`: matches `^\+?[0-9\s\-()]{7,20}$`
- `email`: matches standard email regex (RFC 5322-lite)
- `notes`: optional; if present, max 80 chars (no other format constraint)
- Unknown/extra fields in request body are ignored, not stored

## 4. API Design

| Method | Path | Body | Success | Error cases |
|---|---|---|---|---|
| GET | `/api/contacts` | — | 200, `Contact[]` | — |
| GET | `/api/contacts?search=<term>` | — | 200, filtered `Contact[]` | — |
| GET | `/api/contacts/:id` | — | 200, `Contact` | 404 if not found |
| POST | `/api/contacts` | `Contact` minus `id`/timestamps | 201, created `Contact` | 400 on validation failure |
| PUT | `/api/contacts/:id` | partial/full contact fields | 200, updated `Contact` | 400 validation, 404 not found |
| DELETE | `/api/contacts/:id` | — | 204, no body | 404 not found |

Error response shape (400/404):
```json
{ "error": "message", "details": ["field-level messages"] }
```
500 reserved for unexpected server/file-I/O errors, generic message only (no stack trace leaked).

`search` matches (case-insensitive substring) against `firstName`, `lastName`,
or `email`.

## 5. Frontend Design

- **Contacts List** (`/contacts`): table (Angular Material `mat-table`) —
  columns: name, cell number, email, actions (edit/delete). `notes` is not
  shown as a list column (space) but is visible/editable in the detail forms.
  Search box above table filters via the API `search` query param (debounced).
- **Add Contact** (`/contacts/new`): reactive form (firstName, lastName,
  cellNumber, email, notes — notes optional, 80-char max with live counter),
  same validation rules as backend (mirrored client-side), disabled submit
  until valid.
- **Edit Contact** (`/contacts/:id/edit`): same form, pre-populated via GET by id.
- **Delete**: `MatDialog` confirmation before calling DELETE.
- Loading spinner during in-flight requests; `MatSnackBar` for errors.
- Responsive: table becomes stacked cards below 600px breakpoint.

## 6. Non-Functional / Out of Scope

- No authentication/authorization (single-user training app).
- No pagination (dataset assumed small for this exercise).
- No concurrent-write locking on the JSON file (single-user assumption).
- No E2E test suite required for this iteration — unit (Vitest) on backend,
  unit (Jasmine/Karma) + component tests on frontend are sufficient per the
  ticket's testing strategy. E2E can be added as follow-up if requested.

## 7. Testing Strategy → Acceptance Criteria Mapping

| Acceptance Criterion | Test(s) |
|---|---|
| View list of all contacts | Backend: `GET /api/contacts` integration test. Frontend: contacts-list component test (renders rows) |
| Add a new contact | Backend: `POST` integration test (valid payload → 201). Frontend: add-form component test (submit → API call) |
| Edit an existing contact | Backend: `PUT` integration test. Frontend: edit-form pre-population + submit test |
| Delete a contact (confirmation) | Backend: `DELETE` integration test (404 after delete). Frontend: dialog-confirm interaction test |
| Validation errors on invalid data | Backend: unit tests per validation rule (missing field, bad email, bad phone, over-length name, over-length notes). Frontend: form validators unit test |
| Search/filter by name or email | Backend: `GET ?search=` integration test. Frontend: search-box triggers filtered fetch |
| Works on desktop and mobile | Manual/responsive layout check (documented, not automatable in this iteration) |
| Proper error codes/messages | Backend: 400/404/500 path unit + integration tests |
| CRUD persists across refresh | Backend: JSON file store integration test (write → re-read from disk) |

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| JSON file corruption on crash mid-write | Write to temp file then atomic rename |
| Concurrent requests racing on file writes | Simple in-process write queue/mutex around file I/O |
| Client/server validation drifting out of sync | Single source of truth for regex/limits, documented here; both sides reference this spec |

## 9. Open Questions

None outstanding — both either/or choices in the ticket have been resolved above.
