# REST API documentation

Base URL: `http://localhost:4000/api` (Docker: `http://localhost:8080/api`)

All responses are JSON except `DELETE /tickets/:id`, which returns `204 No Content`.

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

## Business rules

- Users can only read, edit, delete or comment on their own tickets.
- Admins can access every ticket and respond with comments.
- Users cannot edit or delete resolved/closed tickets; admins can still change status/priority.
- Tickets with comments cannot be deleted.
- Setting status to `resolved` produces both `ticket.status_changed` and `ticket.resolved` events.
- Every domain event writes an activity log and creates in-app notifications; email is sent only when SMTP is configured.
