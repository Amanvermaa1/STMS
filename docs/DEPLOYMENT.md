# Deployment guide

The repository is deployment-ready; create the hosted accounts and add the URLs/secrets to complete the live link requirement.

## 1. Database (Neon or Supabase)

Neon (free tier) is the simplest option:

1. Create a project at <https://neon.com> and copy the **pooled** connection string (`-pooler` host).
2. Replace `sslmode=require` with `sslmode=verify-full` for `pg` 8.23+.
3. Keep a separate direct connection string for migrations if your provider requires it.

Set `DATABASE_URL` to the pooled string for the API runtime.

## 2. API (Render)

1. Create a **Web Service** from this repository, root directory `server`, environment **Docker**.
2. Set the start command to:
   ```sh
   sh -c "npm run db:migrate:prod && npm run db:seed:prod && node dist/server.js"
   ```
   (`server/Dockerfile` already builds the TypeScript output.)
3. Environment variables: `DATABASE_URL`, `NODE_ENV=production`, `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=<web-url>`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional SMTP settings.
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
- [ ] Add the live web URL to the README and submission.
- [ ] Rotate all development secrets before sharing publicly.
