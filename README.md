# Support Ticket Management System (STMS)

A mini helpdesk where users raise and track support tickets, and administrators manage, prioritize and resolve them. Built as a full-stack TypeScript application with a REST API, PostgreSQL, JWT authentication, an event-driven activity/notification layer, and an accessible, responsive React + Tailwind CSS v4.3 frontend with adaptive preferences, deterministic assistance, privacy controls and passkey sign-in.

**Live deployment link:** https://stms-web-lwoq.onrender.com/ (API health: https://stms-api-89yn.onrender.com/health)

## Features

- **Authentication:** register, login, refresh and logout with httpOnly cookies; bcrypt password hashing; short-lived JWT access tokens (15m) and rotating hashed refresh tokens (7d).
- **Roles:** `user` and `admin`. Registration cannot self-assign admin; a seed script creates the first administrator.
- **Tickets:** create, view, edit, delete (when eligible), track status, search/filter/sort/paginate, per-ticket statistics.
- **Comments:** users comment on their own tickets; admins respond on any ticket.
- **Admin console:** view all tickets, filter by status/priority, update status/priority, global dashboard statistics.
- **Event-driven actions:** `ticket.created`, `ticket.updated`, `ticket.status_changed`, `ticket.resolved`, `comment.added` → append to activity log, create in-app notifications, optionally send SMTP email.
- **Quality:** Zod validation, centralized error handling, parameterized queries via Drizzle ORM, rate-limited auth routes, ownership checks in the service layer.
- **Accessibility & UX:** skip link, labelled filters/controls, visible focus rings, `aria-live` feedback, reduced-motion support, toasts, modals with Escape/focus handling, skeleton loading states and friendly empty states.
- **Personalization:** saved dashboard widgets and ticket filters, URL-synced filters, autosaved ticket drafts, empathetic microcopy and deterministic category/priority hints.
- **Deterministic assistant:** searches only the signed-in user's own tickets; no external AI, no invented answers. Optional browser-native dictation for ticket descriptions, comments and assistant queries.
- **Privacy controls:** opt-in/opt-out anonymous aggregate analytics, JSON data export and password-confirmed account deletion. No free text or PII is sent in analytics.
- **Passkeys:** WebAuthn registration/authentication with password fallback; challenges expire after five minutes.
- **Offline-friendly:** installable PWA manifest and service worker caches the app shell; API/auth responses are never cached.
- **Theme:** light cream backgrounds with orange/yellow accents, warm stone neutrals and icon-based UI — no emojis and no blue/purple palette.
- **Extras:** Vitest + Supertest + PGlite integration tests (22 passing), Postman collection, Docker Compose, deployment guide.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js 24, Express 5, TypeScript |
| Database | PostgreSQL (Supabase or local Docker), Drizzle ORM + `pg` |
| Validation | Zod |
| Auth | `jsonwebtoken`, `bcryptjs`, cookie-parser, `@simplewebauthn/server` + `/browser` |
| Frontend | React 19, Vite 6, React Router, Axios, Tailwind CSS v4.3 via `@tailwindcss/vite`, Lucide icons |
| Tests | Vitest 3, Supertest, PGlite (in-memory PostgreSQL) |
| Packaging | Docker, nginx, docker-compose |

> Note: Vite 6 / Vitest 3 are pinned because the newer rolldown native binary is blocked by some Windows application-control policies. Tailwind remains on v4.3 with the official Vite plugin.

## Quick start

### Option A — Docker Compose (recommended)

```bash
cd F:\STMS
copy .env.example .env      # Windows (or: cp .env.example .env on macOS/Linux)
docker compose up -d --build
```

- Web: <http://localhost:8080>
- API health: <http://localhost:4000/health>
- Postgres: `localhost:5432` (`stms` / `stms` / `stms`)

Compose applies migrations and seeds the admin automatically. Default admin: `admin@stms.local` / `Admin@12345` (override in `.env`).

### Option B — Local development with hosted PostgreSQL

1. Create a Supabase project and set `DATABASE_URL` (transaction pooler) plus optional `DATABASE_MIGRATION_URL` (session pooler/direct) in `server/.env` (copy `F:\STMS\.env.example` to `F:\STMS\server\.env`). See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
2. Install and run the API:
   ```bash
   cd F:\STMS\server
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev            # http://localhost:4000
   ```
3. In another terminal, run the web app:
   ```bash
   cd F:\STMS\web
   npm install
   npm run dev            # http://localhost:5173, proxies /api to :4000
   ```

Vite proxies `/api` to the Express server, so cookies stay same-origin during development.

## Environment variables

Copy `.env.example` to `server/.env` (local) or `.env` (Compose/deployment).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Supabase: transaction pooler, port 6543) |
| `DATABASE_MIGRATION_URL` | Optional separate connection for migrations (Supabase: session pooler/direct, port 5432); falls back to `DATABASE_URL` |
| `PORT` | API port (default `4000`) |
| `NODE_ENV` | Enables `Secure` cookies when `production` |
| `JWT_SECRET` | Fallback signing secret |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Separate secrets for access/refresh tokens |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` | Token lifetimes |
| `CORS_ORIGIN` | Comma-separated allowed browser origins |
| `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGINS` | Relying-party ID/name and comma-separated origins for passkeys |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Seed administrator |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Optional email notifications; empty host disables email |

## Useful scripts

```bash
# server
npm run dev          # watch mode
npm run build        # compile TypeScript to dist/
npm start            # run compiled server
npm run db:generate  # generate a migration after editing schema.ts
npm run db:migrate   # apply migrations
npm run db:seed      # create/update admin
npm test             # 22 integration tests against PGlite

# web
npm run dev          # Vite dev server with /api proxy
npm run build        # type-check + production build
npm run preview      # serve dist/
```

## Project structure

```
F:\STMS\
├─ docker-compose.yml          # postgres + api + web (nginx)
├─ render.yaml                 # Render blueprint: API web service + static web site
├─ .env.example
├─ docs\
│  ├─ api.md                   # full endpoint reference
│  ├─ database.md              # tables, indexes, design decisions
│  ├─ DEPLOYMENT.md            # Supabase + Render + Docker guide
│  └─ postman\STMS.postman_collection.json
├─ server\
│  ├─ drizzle\                 # generated SQL migrations
│  └─ src\
│     ├─ app.ts                # createApp({ db, eventBus, mailer }) — dependency injection
│     ├─ config, db, middleware, events, services, modules, utils
│     └─ tests\                # helpers + Vitest/Supertest suites
└─ web\
   ├─ nginx.conf               # SPA fallback + /api proxy
   └─ src\
      ├─ api\, auth\, components\, pages\
      └─ index.css             # @import "tailwindcss" (v4.3)
```

## API overview

Full documentation: [docs/api.md](docs/api.md). Postman collection: [docs/postman/STMS.postman_collection.json](docs/postman/STMS.postman_collection.json).

| Prefix | Highlights |
| --- | --- |
| `/api/auth` | register, login, refresh, logout, me |
| `/api/tickets` | CRUD, comments, activity, stats, filters, pagination |
| `/api/admin` | all tickets, global stats, status/priority updates |
| `/api/notifications` | inbox and mark-as-read |
| `/api/me` | preferences, data export, account deletion |
| `/api/analytics` | anonymous event ingestion and admin insights |
| `/api/assistant` | deterministic ticket search |
| `/api/passkeys` | WebAuthn registration, sign-in and management |

Error responses are consistent:

```json
{ "error": { "code": "FORBIDDEN", "message": "...", "details": null } }
```

## Database design

See [docs/database.md](docs/database.md). In short: `users`, `refresh_tokens`, `tickets`, `comments`, `activity_logs`, `notifications`, plus `user_preferences`, `analytics_events`, `passkey_credentials` and `webauthn_challenges`. Enums enforce role/category/priority/status, foreign keys use cascade rules, and indexes cover ownership, status/priority, comments, notification inboxes and analytics. Schema is defined once in Drizzle and the same generated migrations power production, Docker and tests.

## Event workflow

```
Service action ──▶ eventBus.emit(event) ──▶ activity_logs (append-only audit trail)
                                        ──▶ notifications (recipient inbox)
                                        ──▶ nodemailer (only if SMTP configured)
```

Handlers are async and awaited, so tests can assert side effects deterministically. `createApp` accepts the database, event bus and mailer as dependencies, which keeps handlers testable with an in-memory PGlite database and a no-op mailer.

## Testing & verification

```bash
cd server && npm test   # 5 files, 22 tests, all passing
cd ../web && npm run build
```

Covered: registration/login/refresh/logout, admin-only routes, ownership isolation, validation, filtering/search/pagination, edit/delete restrictions, comments, scoped statistics, activity logs and notifications, preference persistence, analytics opt-out and insights, deterministic assistant scoping, and data export/deletion.

## Implementation decisions & challenges

- **Cookies over localStorage:** access and refresh tokens are httpOnly, reducing XSS exposure. Refresh rotation stores only SHA-256 hashes in the database.
- **Single schema source:** Drizzle schema + generated SQL migrations avoid drift between local, hosted and test databases.
- **PGlite for tests:** real PostgreSQL semantics without installing Docker or a server; the Windows rolldown native binding issue was avoided by pinning Vite 6 / Vitest 3.
- **Service-layer authorization:** every ticket query is scoped by owner or admin role, so a missing UI guard cannot leak data.
- **Graceful degradation:** email notifications are optional; SMTP failures are logged and never break ticket operations.
- **No external AI:** the assistant parses deterministic intents and queries the caller's own tickets; it cannot invent answers or send ticket text to third parties.
- **Aggregate-only analytics:** event metadata is limited to small, non-free-text values, and opt-out is enforced server-side.
- **Passkeys without lock-in:** WebAuthn is additive; passwords and refresh cookies remain valid, and users can remove passkeys from Settings.
- **Trade-off:** search uses escaped `ILIKE`, which is sufficient at this scale. For very large datasets, add a `tsvector` column and GIN index.

## Submission checklist

- [x] Complete source code in this repository
- [x] README, setup instructions and decisions
- [x] API documentation and Postman collection
- [x] Database design explanation
- [x] Automated API tests
- [x] Docker support
- [x] Live deployment link — https://stms-web-lwoq.onrender.com/
