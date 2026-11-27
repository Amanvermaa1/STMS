# REST API documentation

Base URL: `http://localhost:4000/api` (Docker: `http://localhost:8080/api`)

All responses are JSON except `DELETE /tickets/:id`, `DELETE /me/data` and `DELETE /passkeys/:id`, which return `204 No Content`.

## Authentication

Authentication uses two httpOnly cookies set by the API:

| Cookie | Lifetime | Purpose |
| --- | --- | --- |
| `access_token` | 15 minutes | Signed JWT sent on every protected request |
| `refresh_token` | 7 days | Rotated opaque token, SHA-256 hashed in PostgreSQL |

Send `credentials: 'include'` (browser) or let Postman's cookie jar handle cookies. On a 401 from a protected route, the frontend automatically calls `POST /auth/refresh` once and retries the original request.

Roles: `user` and `admin`. Registration always creates a `user`; the first admin is created with `npm run db:seed`.

### Error format

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this resource",
    "details": null
  }
}
```

Common codes: `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

---

## Endpoints

### Health & root

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | Public | API name, version and links |
| GET | `/health` | Public | Liveness check |

### Auth — `/api/auth`

| Method | Path | Access | Body | Description |
| --- | --- | --- | --- | --- |
| POST | `/register` | Public | `{ name, email, password }` | Create a user account and start a session |
| POST | `/login` | Public | `{ email, password }` | Start a session |
| POST | `/refresh` | Cookie | — | Rotate refresh token and issue a new access token |
| POST | `/logout` | Auth | — | Revoke refresh token and clear cookies |
| GET | `/me` | Auth | — | Return the current user |

Rate limit: 20 requests / 15 minutes on register and login.

Example:

```bash
curl -c cookies.txt -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"Password123"}'
```

### Tickets — `/api/tickets` (all routes require auth)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | User/Admin | Create a ticket |
| GET | `/` | User/Admin | List own tickets (admin sees all) with filters |
| GET | `/stats` | User/Admin | Counts scoped to own tickets (admin: all) |
| GET | `/:id` | Owner/Admin | Ticket details including author |
| PATCH | `/:id` | Owner/Admin | Edit title, description, category or priority |
| DELETE | `/:id` | Owner/Admin | Delete an open ticket with no comments |
| GET | `/:id/comments` | Owner/Admin | Comments on a ticket |
| POST | `/:id/comments` | Owner/Admin | Add a comment |
| GET | `/:id/activity` | Owner/Admin | Activity log for a ticket |

Create body:

```json
{
  "title": "Laptop will not connect to Wi-Fi",
  "description": "Since yesterday my laptop cannot join the office network.",
  "category": "technical",
  "priority": "high"
}
```

`category`: `general | billing | technical | account | feature_request`.
`priority`: `low | medium | high | urgent`.
`status`: `open | in_progress | resolved | closed` (users cannot set status directly).

List query parameters:

| Param | Default | Notes |
| --- | --- | --- |
| `status` | — | Exact status filter |
| `priority` | — | Exact priority filter |
| `category` | — | Exact category filter |
| `search` | — | ILIKE search on title and description |
| `sortBy` | `createdAt` | `createdAt \| updatedAt \| priority \| status` |
| `sortOrder` | `desc` | `asc \| desc` |
| `page` | `1` | 1-based |
| `limit` | `10` | 1–50 |

List response:

```json
{
  "items": [
    {
      "id": "0b5d…",
      "title": "Laptop will not connect to Wi-Fi",
      "category": "technical",
      "priority": "high",
      "status": "open",
      "authorId": "8c2f…",
      "authorName": "Jane Doe",
      "createdAt": "2026-11-26T10:00:00.000Z",
      "updatedAt": "2026-11-26T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### Admin — `/api/admin` (admin role required)

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| GET | `/tickets` | — | All tickets with the same filters as above |
| GET | `/stats` | — | Global statistics |
| PATCH | `/tickets/:id/status` | `{ "status": "resolved" }` | Change status; emits status + resolved events |
| PATCH | `/tickets/:id/priority` | `{ "priority": "urgent" }` | Change priority |

### Notifications — `/api/notifications` (all routes require auth)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Latest 50 notifications and unread count for the current user |
| PATCH | `/:id/read` | Mark one of the current user's notifications as read |

Example notification:

```json
{
  "id": "e4a1…",
  "ticketId": "0b5d…",
  "type": "ticket.status_changed",
  "message": "Ticket #0b5d1f2a status changed to resolved",
  "readAt": null,
  "createdAt": "2026-11-26T10:05:00.000Z"
}
```

### Preferences & data — `/api/me` (all routes require auth)

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| GET | `/preferences` | — | Return dashboard, ticket-list and privacy preferences with defaults |
| PATCH | `/preferences` | `{ "dashboard": { "widgets": [...] }, "tickets": { ... }, "privacy": { ... } }` | Merge and persist supported preference keys |
| GET | `/data` | — | Export account, preferences, tickets, comments, notifications, activity and analytics (never the password hash) |
| DELETE | `/data` | `{ "password": "current-password" }` | Delete the account and related rows after password confirmation; clears auth cookies |

Preference payload example:

```json
{
  "dashboard": { "widgets": ["summary", "recent", "priority"] },
  "tickets": { "status": "open", "priority": "high", "sortBy": "updatedAt", "sortOrder": "desc", "limit": 10 },
  "privacy": { "analyticsOptIn": false, "productUpdatesOptIn": false }
}
```

### Analytics — `/api/analytics`

| Method | Path | Access | Body | Description |
| --- | --- | --- | --- | --- |
| POST | `/events` | Auth | `{ "events": [{ "type": "ticket.view", "metadata": { "detail": true } }] }` | Record 1–25 anonymous signals; returns `{ "recorded": n }` with status 202 |
| GET | `/insights` | Admin | — | 30-day aggregates by event type plus recent event types |

Allowed event types: `auth.login`, `ticket.view`, `ticket.create_started`, `ticket.create_completed`, `ticket.search`, `ticket.filter_changed`, `ticket.comment_added`, `notification.opened`, `assistant.query`, `settings.updated`.

Metadata values are limited to short strings, numbers, booleans or null. If `privacy.analyticsOptIn` is `false`, ingestion is ignored server-side (`recorded: 0`). No ticket text, email or name is accepted.

### Assistant — `/api/assistant` (all routes require auth)

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| POST | `/query` | `{ "query": "show my urgent billing tickets" }` | Deterministically parse status/priority/category/keywords and search only the caller's tickets |

Example response:

```json
{
  "answer": "I found 2 matching tickets. Here are the most recent:",
  "tickets": [{ "id": "0b5d…", "title": "Invoice is wrong", "status": "open", "priority": "urgent", "category": "billing", "updatedAt": "2026-11-26T10:00:00.000Z" }],
  "total": 2,
  "filters": { "status": null, "priority": "urgent", "category": "billing", "search": null }
}
```

Count-style questions (`how many`, `count`, `total`) return counts from the caller's scoped statistics. No external model or API is involved.

### Passkeys — `/api/passkeys`

| Method | Path | Access | Body | Description |
| --- | --- | --- | --- | --- |
| GET | `/` | Auth | — | List the current user's passkey metadata (no public keys) |
| POST | `/register/options` | Auth | — | Generate registration options and store a 5-minute challenge |
| POST | `/register/verify` | Auth | Browser `RegistrationResponseJSON` | Verify attestation and save the credential |
| POST | `/authenticate/options` | Public | `{ "email": "jane@example.com" }` (optional) | Generate authentication options; omit email for discoverable passkeys |
| POST | `/authenticate/verify` | Public | `{ "email": "…", "response": AuthenticationResponseJSON }` | Verify assertion, update counter and issue the normal session cookies |
| DELETE | `/:id` | Auth | — | Remove one of the current user's passkeys |

Configure `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME` and comma-separated `WEBAUTHN_ORIGINS` before using passkeys outside `localhost`. Passwords remain supported; passkeys are additive.

## Business rules

- Users can only read, edit, delete or comment on their own tickets.
- Admins can access every ticket and respond with comments.
- Users cannot edit or delete resolved/closed tickets; admins can still change status/priority.
- Tickets with comments cannot be deleted.
- Setting status to `resolved` produces both `ticket.status_changed` and `ticket.resolved` events.
- Every domain event writes an activity log and creates in-app notifications; email is sent only when SMTP is configured.
- Analytics collection respects the per-user opt-out and stores no ticket free text.
- Assistant results are scoped to the authenticated user; admins do not gain cross-user access through the assistant.
- Account deletion requires the correct password and clears both auth cookies.
