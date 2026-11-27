# Deployment guide

The repository is deployment-ready; create the hosted accounts and add the URLs/secrets to complete the live link requirement.

## Live deployment (current)

- **Web:** https://stms-web-lwoq.onrender.com/
- **API health:** https://stms-api-89yn.onrender.com/health
- The API is proxied same-origin through the web site's `/api/*` rewrite, so cookies and CORS work from the web URL above.

## 1. Database (Supabase)

1. Create a project at <https://supabase.com/dashboard> and copy the connection strings from **Project Settings → Database → Connection strings**.
2. Use the **Transaction pooler** string (port `6543`) for the API runtime:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true"
   ```
3. Use the **Session pooler** or **direct** string (port `5432`) for migrations:
   ```env
   DATABASE_MIGRATION_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true"
   ```
   The `uselibpqcompat=true` flag keeps `sslmode=require` compatible with node-postgres v8 and the Supabase pooler certificate chain.
   `DATABASE_MIGRATION_URL` falls back to `DATABASE_URL`, so it is optional for local Docker/Postgres.
4. Apply the generated tables before starting the API:
   ```bash
   cd server
   npm run db:migrate
   npm run db:seed
   ```
   The Supabase free tier pauses idle databases, so the first request after a pause may take a few seconds.

## 2. API (Render)

A root `render.yaml` blueprint defines both the API (`stms-api`) and static web site (`stms-web`). You can deploy both at once with **New → Blueprint** and point Render at this repository. The blueprint generates JWT secrets and prompts for `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the API image runs migrations and seeds on start.

To create the API manually instead:

1. Create a **Web Service** from this repository, root directory `server`, environment **Docker**.
2. Set the start command to:
   ```sh
   sh -c "npm run db:migrate:prod && npm run db:seed:prod && node dist/server.js"
   ```
   (`server/Dockerfile` already builds the TypeScript output.)
3. Environment variables: `DATABASE_URL`, `NODE_ENV=production`, `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=<web-url>`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional SMTP settings.
   For passkeys, also set `WEBAUTHN_RP_ID` to your web domain (without protocol/port), `WEBAUTHN_RP_NAME` to a friendly product name, and `WEBAUTHN_ORIGINS` to the comma-separated HTTPS origin(s) of the web app.
4. Health check path: `/health`.
5. Note the API URL, e.g. `https://stms-api-89yn.onrender.com`. If the blueprint's `stms-api` name is already taken globally, Render appends a suffix; update the web rewrite destination and the API's `CORS_ORIGIN`/`WEBAUTHN_*` values to the actual URLs.

## 3. Web (Render static site)

1. Create a **Static Site** from this repository, root directory `web`, build command `npm ci && npm run build`, publish directory `dist`.
2. Add rewrites: `/api/*` → `https://stms-api-89yn.onrender.com/api/*` and `/*` → `/index.html`. The root `render.yaml` blueprint already defines both.
3. The browser calls same-origin `/api`, so the auth cookies stay first-party. Keep the API's `CORS_ORIGIN`, `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGINS` set to the actual web URL.
4. Live site: https://stms-web-lwoq.onrender.com/

Render is the only hosted deployment target for this submission.

## 4. Alternative: single-host Docker Compose

On any VPS with Docker:

```bash
cp .env.example .env
docker compose up -d --build
```

Web: `http://host:8080`, API: `http://host:4000/health`. The Compose file starts PostgreSQL, applies migrations, seeds the admin, and serves the SPA through nginx with an `/api` proxy.

## 5. Post-deployment checklist

- [ ] `GET /health` returns `{"status":"ok"}`.
- [ ] Register a user, log in, create a ticket.
- [ ] Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, change status to resolved.
- [ ] Confirm the user receives a notification and the activity log shows the events.
- [ ] In Settings, add a passkey and sign out; sign back in with the passkey on the configured origin.
- [ ] Toggle analytics off and confirm the admin insights counter does not increase.
- [ ] Add the live web URL to the README and submission.
- [ ] Rotate all development secrets before sharing publicly.
