# Support Ticket Management System (STMS)

A mini helpdesk where users raise and track support tickets, and administrators manage, prioritize and resolve them. Built as a full-stack TypeScript application with a REST API, PostgreSQL, JWT authentication, an event-driven activity/notification layer, and a responsive React + Tailwind CSS v4.3 frontend.

**Live deployment link:** _to be added after deploying (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))_

## Features

- **Authentication:** register, login, refresh and logout with httpOnly cookies; bcrypt password hashing; short-lived JWT access tokens (15m) and rotating hashed refresh tokens (7d).
- **Roles:** `user` and `admin`. Registration cannot self-assign admin; a seed script creates the first administrator.
- **Tickets:** create, view, edit, delete (when eligible), track status, search/filter/sort/paginate, per-ticket statistics.
- **Comments:** users comment on their own tickets; admins respond on any ticket.
- **Admin console:** view all tickets, filter by status/priority, update status/priority, global dashboard statistics.
- **Event-driven actions:** `ticket.created`, `ticket.updated`, `ticket.status_changed`, `ticket.resolved`, `comment.added` → append to activity log, create in-app notifications, optionally send SMTP email.
- **Quality:** Zod validation, centralized error handling, parameterized queries via Drizzle ORM, rate-limited auth routes, ownership checks in the service layer.
- **Theme:** light cream backgrounds with orange/yellow accents, warm stone neutrals and icon-based UI — no emojis and no blue/purple palette.
- **Extras:** Vitest + Supertest + PGlite integration tests (16 passing), Postman collection, Docker Compose, deployment guide.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js 24, Express 5, TypeScript |
| Database | PostgreSQL (Neon/Supabase or local Docker), Drizzle ORM + `pg` |
| Validation | Zod |
| Auth | `jsonwebtoken`, `bcryptjs`, cookie-parser |
| Frontend | React 19, Vite 6, React Router, Axios, Tailwind CSS **v4.3** via `@tailwindcss/vite`, Lucide icons |
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

1. Create a Neon/Supabase database and set `DATABASE_URL` in `server/.env` (copy `F:\STMS\.env.example` to `F:\STMS\server\.env`).
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
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API port (default `4000`) |
| `NODE_ENV` | Enables `Secure` cookies when `production` |
| `JWT_SECRET` | Fallback signing secret |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Separate secrets for access/refresh tokens |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` | Token lifetimes |
| `CORS_ORIGIN` | Comma-separated allowed browser origins |
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
npm test             # 16 integration tests against PGlite

# web
npm run dev          # Vite dev server with /api proxy
npm run build        # type-check + production build
npm run preview      # serve dist/
```

## Project structure

```
F:\STMS\
├─ docker-compose.yml          # postgres + api + web (nginx)
├─ .env.example
├─ docs\
│  ├─ api.md                   # full endpoint reference
│  ├─ database.md              # tables, indexes, design decisions
│  ├─ DEPLOYMENT.md            # Neon + Render + Vercel/Netlify guide
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

Error responses are consistent:

```json
{ "error": { "code": "FORBIDDEN", "message": "...", "details": null } }
```

## Database design

See [docs/database.md](docs/database.md). In short: `users`, `refresh_tokens`, `tickets`, `comments`, `activity_logs`, `notifications`, with enums for role/category/priority/status, foreign keys with cascade rules, and indexes on ownership, status/priority, ticket comments and notification inboxes. Schema is defined once in Drizzle and the same generated migrations power production, Docker and tests.

## Event workflow

```
Service action ──▶ eventBus.emit(event) ──▶ activity_logs (append-only audit trail)
                                        ──▶ notifications (recipient inbox)
                                        ──▶ nodemailer (only if SMTP configured)
```

Handlers are async and awaited, so tests can assert side effects deterministically. `createApp` accepts the database, event bus and mailer as dependencies, which keeps handlers testable with an in-memory PGlite database and a no-op mailer.

## Testing & verification

```bash
cd server && npm test   # 3 files, 16 tests, all passing
cd ../web && npm run build
```

Covered: registration/login/refresh/logout, admin-only routes, ownership isolation, validation, filtering/search/pagination, edit/delete restrictions, comments, scoped statistics, activity logs and notifications.

## Implementation decisions & challenges

- **Cookies over localStorage:** access and refresh tokens are httpOnly, reducing XSS exposure. Refresh rotation stores only SHA-256 hashes in the database.
- **Single schema source:** Drizzle schema + generated SQL migrations avoid drift between local, hosted and test databases.
- **PGlite for tests:** real PostgreSQL semantics without installing Docker or a server; the Windows rolldown native binding issue was avoided by pinning Vite 6 / Vitest 3.
- **Service-layer authorization:** every ticket query is scoped by owner or admin role, so a missing UI guard cannot leak data.
- **Graceful degradation:** email notifications are optional; SMTP failures are logged and never break ticket operations.
- **Trade-off:** search uses escaped `ILIKE`, which is sufficient at this scale. For very large datasets, add a `tsvector` column and GIN index.

## Submission checklist

- [x] Complete source code in this repository
- [x] README, setup instructions and decisions
- [x] API documentation and Postman collection
- [x] Database design explanation
- [x] Automated API tests
- [x] Docker support
- [ ] Live deployment link — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
