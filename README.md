# Momenta

Momenta is a collaborative moment wall application. Users create a moment, invite contributors to post text, images, GIFs, stickers, and video, then share or present the collected posts as a slideshow.

## Features

- Moment creation with title, occasion, description, theme, animation, and audio
- Contributor posting: text (rich text), image, GIF, sticker, video
- Role-based access: owner, maintainer, poster, viewer, recipient
- Reactions, post moderation, reporting workflow
- Scheduled delivery to recipients via email
- Share modal with QR code, copy link, and social options
- Download and slideshow presentation views
- Google OAuth and JWT token-based auth
- Real-time notifications via Socket.io
- Structured JSON logging, Redis caching, rate limiting

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Angular 21, Bootstrap 5, Bootstrap Icons |
| Backend | Node.js, Express, Mongoose, Passport, JWT |
| Database | MongoDB, Redis |
| Media | Local media storage mounted via Docker volume |
| Real-time | Socket.io with Redis adapter |
| DevOps | Docker Compose |
| Tests | Angular/Karma (frontend), Node test runner (backend) |

## Repository Layout

```text
.
├── backend/
│   └── src/
│       ├── config/          # DB connection, upload config, security config
│       ├── controllers/     # HTTP handlers (wall, post, user, mail, giphy, upload, event)
│       ├── domain/          # Pure business rules (no I/O)
│       ├── middleware/      # Auth, validation, rate limiting
│       ├── models/          # Mongoose schemas
│       ├── repositories/    # All DB access
│       ├── routes/          # Express route definitions
│       ├── services/        # Business logic layer
│       ├── templates/       # Email HTML templates
│       └── utils/           # Redis client, counter cache, logger, message broker
├── frontend/
│   └── src/app/
│       ├── components/      # Routed feature components
│       ├── modal/           # Modal components
│       ├── models/          # TypeScript interfaces
│       ├── services/        # API and shared services
│       ├── middleware/      # HTTP interceptors, auth guards
│       ├── shared/          # Shared types and helpers
│       └── utils/           # Reusable UI utilities
├── docker-compose.yml
└── .env.example
```

## Data Models

| Collection | Purpose |
| --- | --- |
| `users` | User accounts with status, profile picture URL |
| `verificationtokens` | Email verify and password reset tokens (TTL auto-delete) |
| `walls` | Moment walls with slug, theme, status, postConfig |
| `wallmembers` | Role-based access: owner / maintainer / poster / viewer / recipient |
| `posts` | Posts with media sub-doc, status enum, pinned, isEdited |
| `postreports` | Moderation reports per post (replaces flat reportedBy array) |
| `reactions` | Typed reactions: heart / clap / laugh / wow / sad / celebrate |
| `notifications` | Fan-out notifications with per-recipient status, 30-day TTL |
| `savedwalls` | Saved and favourite walls per user |
| `mailjobs` | Scheduled email jobs with status, retry tracking |
| `wallinteractions` | Tracks who has viewed a wall (powers recents + isNew flag) |
| `wallanalytics` | Daily view/post/reaction rollups per wall |
| `accesscontrols` | Global email/domain whitelist and blacklist |

## API

Base: `/api`

| Resource | Routes |
| --- | --- |
| Walls | `GET/POST /walls` · `GET/PUT/DELETE /walls/:wallId` |
| Posts | `GET/POST /walls/:wallId/posts` · `GET/PUT/DELETE /walls/:wallId/posts/:postId` |
| Reactions | `POST/DELETE /walls/:wallId/posts/:postId/react/:type` |
| Users | `POST /users/account/create` · `POST /users/account/login` · etc. |
| Mail | `POST /mail/schedule` · `GET /mail/scheduled/:wallId` · etc. |
| Uploads | `POST /uploads/media` · `GET /uploads/retrieve-file` |
| Giphy | `GET /giphy/gifs/trending` · `GET /giphy/gifs/search` |
| Themes | `GET /themes` |
| Health | `GET /health` |

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop

## Environment Setup

```powershell
Copy-Item .env.example .env
```

Edit `.env` and fill in:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Long random string for access token signing |
| `DELIVERED_JWT_SECRET` | Long random string for recipient view tokens |
| `SESSION_SECRET` | Long random string for session store |
| `REDIS_PASSWORD` | Redis auth password |
| `MONGODB_INITDB_ROOT_USERNAME` | MongoDB root user |
| `MONGODB_INITDB_ROOT_PASSWORD` | MongoDB root password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GIPHY_API_KEY` | Giphy API key for GIF search |
| `MEDIA_FILE_PATH` | Local absolute path for uploaded media |
| `EMAIL_APP_USER` | Gmail address for sending emails |
| `EMAIL_APP_PASS` | Gmail app password |

Never commit `.env` — it is gitignored.

## Running Locally

```powershell
docker compose up --build
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:4200 |
| API | http://localhost:8071 |
| Mongo Express | http://localhost:8073 |

Restart a single service after code changes:

```powershell
docker compose restart api
docker compose restart ui
```

## Running Without Docker

```powershell
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run start
```

## Testing

```powershell
# Backend
cd backend && npm run test

# Frontend (headless)
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless

# Frontend production build
cd frontend && npm run build

# Security audit
cd backend && npm audit --audit-level=high
cd frontend && npm audit
```

## Development Guidelines

- Controllers delegate to services. Services call repositories. Repositories own all DB queries.
- Domain files are pure functions — no I/O, no side effects.
- All secrets via environment variables — never hardcode.
- CORS restricted to `CORS_ORIGINS` env var in production.
- Add tests for auth, validation, limits, permissions, and edge cases.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| API changes not reflected | `docker compose restart api` |
| Frontend changes not reflected | `docker compose restart ui` |
| 401 on direct API call | Login via app or pass `Authorization: Bearer <token>` |
| GIF search fails | Set `GIPHY_API_KEY` in `.env` |
| Media upload fails | Check `MEDIA_FILE_PATH` and Docker volume permissions |
| OAuth callback fails | Google OAuth callback must point to `${SERVICE_BASE_URL}/api/oauth-redirect` |

## Security

- Secrets via environment variables only
- JWT blacklist stored in Redis with auto-expiring TTL
- Sessions backed by Redis store
- Rate limiting backed by Redis (global across all instances)
- Helmet security headers on all responses
- HttpOnly session cookies in production
- Input validation via express-validator at middleware layer

## License

ISC
