# Momenta — Architecture, Permissions & Socket Events

Reference for how the backend is structured, how access control is enforced, and
what real-time events flow over Socket.IO. Pairs with the live API docs at
`/api/docs` (OpenAPI spec at `/api/docs.json`).

---

## 1. System overview

```
Angular SPA ──HTTP /api──▶ Express ──▶ Controller ──▶ Service ──▶ Repository ──▶ MongoDB
     ▲                        │            │             │
     │                        │            │             └─▶ Domain rules (pure, no I/O)
     └──── Socket.IO ◀────────┘            └─▶ Redis (cache / counters / sessions / blacklist)
                                           └─▶ Kafka (notification + analytics events)
```

- **Frontend**: Angular 21 standalone components, lazy-routed, OnPush everywhere.
- **Backend**: Node/Express. MongoDB (single-node replica set → transactions),
  Redis (sessions, rate-limit store, Socket.IO adapter, counter cache, JWT
  blacklist), Kafka (async notification/analytics fan-out, optional).
- **Media**: stored on a Docker volume; images recompressed on upload (`sharp`).

## 2. Layered backend (strict boundaries)

| Layer | Folder | Responsibility | May call |
|---|---|---|---|
| Routes | `src/routes` | URL → middleware chain → controller | controllers |
| Controllers | `src/controllers` | Parse request, call service, shape response. **Thin.** | services |
| Services | `src/services` | Orchestrate use-cases, transactions, events | repositories, domain |
| Domain | `src/domain` | Pure business rules, **no I/O** | nothing |
| Repositories | `src/repositories` | **Only** place Mongoose models are touched | models |
| Models | `src/models` | Mongoose schemas + indexes | — |

**Rule:** controllers never touch Mongoose; only repositories do. Services never
import models directly. This keeps data access in one auditable layer.

## 3. Request flow (example: create a post)

1. `POST /api/walls/:wallId/posts`
2. Middleware chain: `verifyToken` → `postWriteLimiter` (Redis) →
   `idempotencyCheck` → `authorizePostAction` → `validateWall` →
   `upload.single("file")` (multer + `sharp` compression).
3. Controller calls `postService.addPost(...)`.
4. Service wraps `Post.create` + `WallInteraction` upsert in a Mongo
   **transaction** (`withTransaction`, falls back gracefully on standalone),
   then bumps a Redis counter post-commit and publishes a notification event.
5. Repository performs the actual writes.

## 4. Permission model

### Roles (`wall-members.role`)
`owner` › `maintainer` › `poster` › `viewer` › `recipient`

- **owner** — full control (created the wall).
- **maintainer** — manage settings, moderate, approve posts.
- **poster** — create posts.
- **viewer** — read-only.
- **recipient** — receives the wall via a delivery link (receiver token).

### Two access primitives (`wall-repository.js`)

- **`getUserRole(wallId, userEmail)`** → returns the member's role (or `null`).
  Role-gated actions (approve, pin, settings) check this. Result is **cached in
  Redis** (`getRoleCache`/`setRoleCache`).
- **`hasAccess(wallId, userEmail)`** → boolean "can this user see/use the wall":
  1. `true` if the wall is `anyoneCanView` or `anyoneCanPost` (public).
  2. otherwise `true` if a `WallMember` exists matching the user's **email**
     **or their email domain** (domain-level grants).
  3. else `false`. Result is cached in Redis (`getAccessCache`).

### Access lists
Walls carry `viewAccess` / `postAccess` = `{ emails[], domains[] }`. Membership
rows are derived from these. Domain grants let e.g. everyone `@acme.com` in.

### Enforcement points
- HTTP: route middleware (`authorizePost`, `authorizePostAction`,
  `authorizeApproval`, `authorizePinPost`, `validateWall`, `checkArchive`).
- Socket: `joinWall` validates `hasAccess` **before** joining the room (so
  presence can't leak across walls).
- Receiver links: `view-receiver-wall/:token` + `accept-invite` use signed
  tokens instead of a session JWT.

### Token model
- Session JWT in `Authorization: Bearer`, blacklisted on logout (Redis, TTL).
  Blacklist check **fails open** (logged + metered) so a Redis blip can't lock
  everyone out.
- Receiver/view tokens: separate, longer-lived, for shared wall links.

## 5. Socket.IO events

Socket.IO uses the **Redis adapter**, so rooms/presence work across instances.
Rooms are namespaced `wall:<wallId>`.

### Client → server
| Event | Payload | Effect |
|---|---|---|
| `joinWall` | `{ wallId, email }` | Access-checked (`hasAccess`); joins `wall:<id>`, adds presence |
| `leaveWall` | `{ wallId, email }` | Leaves room, removes presence |
| `refreshNotifications` | `{ email }` | Client asks to re-pull notifications |
| `updateNotification` | `{ ... }` | Mark notification read/updated |
| `disconnect` | — | Cleanup presence, decrement socket gauge |

### Server → client
| Event | Payload | When |
|---|---|---|
| `presenceUpdate` | `{ wallId, users[] }` | Emitted to `wall:<id>` on join/leave/disconnect |

Notifications themselves fan out asynchronously via **Kafka** → consumer →
handler (idempotent via `eventId`), not via a direct socket emit.

## 6. Data integrity & resilience

- **Transactions** for multi-doc writes; counter updates are reconcilable (a
  `node-cron` job periodically purges `cnt:posts:*` so Redis counters can't drift
  permanently).
- **Kafka** consumer retries → dead-letter topic `<topic>.DLQ`; payloads carry an
  `eventId` for idempotency.
- **Graceful shutdown** drains in order: stop HTTP → close Socket.IO → mail timers
  → Kafka → Mongo → Redis (15s guard).
- **Observability**: Prometheus metrics at `/metrics`; correlation-id
  (`X-Request-ID`) stamped per request and threaded into logs via
  `AsyncLocalStorage` + pino.

## 7. Health & ops
- `GET /actuator/health` — checks Mongo + Redis, returns `UP`/`DOWN`.
- `GET /health` — thin `{status:ok}` alias for the Docker HEALTHCHECK.
- `GET /metrics` — Prometheus exposition.
- `GET /api/docs` — Swagger UI; `GET /api/docs.json` — raw OpenAPI 3.0 spec.
