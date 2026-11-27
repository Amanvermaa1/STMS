# Deployment guide

The repository is deployment-ready; create the hosted accounts and add the URLs/secrets to complete the live link requirement.

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

1. Create a **Web Service** from this repository, root directory `server`, environment **Docker**.
2. Set the start command to:
   ```sh
   sh -c "npm run db:migrate:prod && npm run db:seed:prod && node dist/server.js"
   ```
   (`server/Dockerfile` already builds the TypeScript output.)
3. Environment variables: `DATABASE_URL`, `NODE_ENV=production`, `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=<web-url>`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional SMTP settings.
   For passkeys, also set `WEBAUTHN_RP_ID` to your web domain (without protocol/port), `WEBAUTHN_RP_NAME` to a friendly product name, and `WEBAUTHN_ORIGINS` to the comma-separated HTTPS origin(s) of the web app.
4. Health check path: `/health`.
5. Note the API URL, e.g. `https://stms-api.onrender.com`.

## 3. Web (Vercel / Netlify / Render Static)

1. Import the repository with root directory `web`, framework **Vite**, build command `npm run build`, output directory `dist`.
2. The browser calls relative `/api` paths. Add a rewrite/proxy so `/api/*` forwards to the API URL:
   - **Vercel** `vercel.json`:
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
3. Set `CORS_ORIGIN` on the API to the deployed web origin. Cookies are `httpOnly; SameSite=Lax` in development and `Secure; SameSite=Lax` in production, which works when the web app proxies `/api` on the same site.
4. Note the web URL — this is the **live deployment link** for the submission.

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
