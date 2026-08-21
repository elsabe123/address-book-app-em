# address-book-app-em

A full-stack Address Book app — an Express REST API and an Angular 17+
frontend for managing contacts (create, view, search, edit, delete).

See [docs/SDD/1-address-book-crud.spec.md](docs/SDD/1-address-book-crud.spec.md)
for the full spec and [docs/SDD/1-address-book-crud.plan.md](docs/SDD/1-address-book-crud.plan.md)
for the implementation plan.

## Project layout

```
backend/    Express REST API (JSON-file data store)
frontend/   Angular standalone-components app
```

## Backend

```bash
cd backend
npm install
npm run dev     # starts the API on http://localhost:3000 (nodemon, auto-reload)
npm test        # runs the Vitest unit + integration suite
```

Data is persisted to `backend/data/contacts.json` (gitignored; created
automatically on first run from `backend/data/contacts.json.example`).

## Frontend

```bash
cd frontend
npm install
npm start        # starts the Angular dev server on http://localhost:4200
npm test -- --watch=false --browsers=ChromeHeadless   # runs the Jasmine/Karma suite
```

The frontend expects the backend API to be running at `http://localhost:3000/api`.

## Running both together

Start the backend (`npm run dev` in `backend/`) and the frontend
(`npm start` in `frontend/`) in two separate terminals, then open
`http://localhost:4200`.
