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

## 3. Web + API together (Vercel Services)

1. Import the repository at the **repo root**. The root `vercel.json` defines two services:
   - `server` — Express API, public at `/api/*` and `/health`
   - `web` — Vite SPA, public at `/`
2. No service bindings are needed. The browser calls same-origin `/api`, and the API makes no calls back to the web service.
3. Set these project environment variables (shared by both services):
   `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `JWT_SECRET`,
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=<vercel-url>`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `WEBAUTHN_RP_ID=<vercel-hostname>`,
   `WEBAUTHN_ORIGINS=<vercel-origin>`, and optional SMTP settings.
4. The `server` build command runs `npm run build && npm run db:migrate:prod && npm run db:seed:prod`, so schema and admin seed are ready before the API serves traffic.
5. If this host is used, note its URL and verify `/health` and `/login` return non-404 responses before submitting. The current submission uses the Render web URL above.

### Web-only alternative (separate API host)

If you prefer to keep the API on Render instead, import only the `web` directory and proxy `/api`:

- **Vercel** `vercel.json` (web-only project):
  ```json
  {
    "rewrites": [
      { "source": "/api/(.*)", "destination": "https://YOUR-API.onrender.com/api/$1" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- **Netlify** `_redirects`:
  ```
  /api/*  https://YOUR-API.onrender.com/api/:splat  200
  /*      /index.html  200
  ```

Set `CORS_ORIGIN` on the API to the deployed web origin. Cookies are `httpOnly; SameSite=Lax` in development and `Secure; SameSite=Lax` in production, which works when the web app proxies `/api` on the same site.

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
