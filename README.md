# CultureMatch

CultureMatch is a React Native / Expo + Node.js MVP for cultural friendship, dating, events, and small communities. It is built as a monorepo:

- `apps/api` - Express, PostgreSQL/PostGIS, Redis-ready services, Socket.io chat.
- `apps/mobile` - Expo Router mobile app with onboarding, discovery, chat, events, communities, profile, privacy, and settings screens.

## Recent Improvements ✨

**Фаза 1: Фундамент** (Completed)
- ✅ **Структурированное логирование** - Pino logger с JSON логами, request tracing, pretty-print в dev
- ✅ **Улучшенная обработка ошибок** - типизированные HTTP errors, коды ошибок, request ID
- ✅ **Валидация с Zod** - middleware для body/query/params, переиспользуемые схемы
- ✅ **Redis кэширование** - compatibility scores, graceful degradation, cache utilities

См. [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) для деталей и [CHANGELOG.md](CHANGELOG.md) для полного списка изменений.

## Run locally

1. Copy environment:

```bash
cp .env.example .env
```

2. Start infrastructure:

```bash
docker compose up postgres redis
```

3. Install dependencies:

```bash
npm install
```

4. Apply schema and seed data:

```bash
npm run seed
```

5. Start API:

```bash
npm run dev:api
```

6. Start mobile app:

```bash
npm run dev:mobile
```

Expo Go is the first target. Native builds are only needed once Apple/Google production sign-in configuration and push credentials are wired.

## API Docs

OpenAPI spec lives at `apps/api/openapi.yaml`. With the API running:

- Health: `GET http://localhost:4000/health` (includes DB and Redis status)
- OpenAPI JSON: `GET http://localhost:4000/docs/openapi.json`
- Swagger UI: `http://localhost:4000/docs`

## Environment Variables

Key variables in `.env`:

```bash
# Logging
LOG_LEVEL=info          # fatal, error, warn, info, debug, trace

# Database
DATABASE_URL=postgres://culturematch:culturematch@localhost:5432/culturematch

# Redis (optional, app works without it)
REDIS_URL=redis://localhost:6379

# JWT Secrets (change in production!)
JWT_ACCESS_SECRET=replace-with-32-byte-secret
JWT_REFRESH_SECRET=replace-with-32-byte-refresh-secret

# Email (optional in dev)
RESEND_API_KEY=your-key-here
FROM_EMAIL=no-reply@culturematch.local
```

## What is implemented in this MVP

- Modular backend folders: auth, users, discovery, matching, chat, events, communities, notifications, moderation, privacy, media, search.
- PostgreSQL schema matching the requested tables, with PostGIS enabled.
- Compatibility scoring with tests and Redis caching.
- JWT access tokens, refresh token rotation, magic-link token hashing model, session revoke paths.
- Seed script for demo users, events, communities, and cultural icebreakers.
- Socket.io chat gateway with message persistence.
- Expo app screens for onboarding, auth, tabs, discovery, chat, events, communities, profile, filters, search, safety, privacy, settings.
- EN/RU i18n files and language switch shell.
- **Production-ready logging** with Pino (JSON logs, request tracing).
- **Error handling** with typed errors and proper HTTP codes.
- **Input validation** with Zod schemas.
- **Redis caching** for performance optimization.

## Not production-complete yet

Apple/Google sign-in verification, real email delivery, S3/R2 presigned uploads, APNs/FCM credentials, and AI moderation are represented by clean service seams and safe fallbacks, but they require provider credentials before real production use.

## Testing

```bash
# Run all tests
npm run test

# Type checking
npm run typecheck
```

All tests passing: ✅ 41 tests across 8 files

## Project Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── lib/           # Utilities (logger, redis, cache)
│   │   ├── http/          # HTTP utilities (errors, validation)
│   │   ├── modules/       # Feature modules
│   │   ├── db/            # Database (pool, migrations, seed)
│   │   ├── app.ts         # Express app setup
│   │   └── server.ts      # Server entry point
│   └── tests/             # Unit tests
└── mobile/                # Expo React Native app

docs/                      # Documentation
├── IMPROVEMENTS.md        # Detailed improvements guide
└── ...
```
