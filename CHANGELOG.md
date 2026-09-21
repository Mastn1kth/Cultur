# Changelog

## [Unreleased] - 2024-06-11

### Added - Фаза 2: Production-готовность

#### Пагинация всех list endpoints
- **Cursor-based пагинация** для всех списковых endpoint'ов:
  - `GET /events` — cursor по `starts_at`
  - `GET /communities` — cursor по `created_at`
  - `GET /chat/conversations` — cursor по `last_message_at`
  - `GET /chat/conversations/:id/messages` — cursor по `created_at`
  - `GET /matching/matches` — cursor по `matched_at`
  - `GET /communities/:id/messages` — cursor по `created_at`
  - `GET /search` — настраиваемый `limit`
  - `GET /events`, `GET /search` — параллельные запросы через `Promise.all`
- **Единая утилита** `paginatedResponse(rows, limit)` в `src/http/validation.ts:90`
- **Единая схема валидации** `commonSchemas.cursor` (cursor + limit)

#### Redis-based rate limiting
- Создан `src/lib/rate-limit.ts` с tiered лимитами:
  - `generalLimiter` — 300 req/min
  - `authLimiter` — 10 req/min (для /auth)
  - `swipeLimiter` — 100 req/min (для swipes)
  - `strictLimiter` — 20 req/min
- Подготовлен код для Redis store через rate-limit-redis
- При недоступности Redis — graceful fallback на in-memory store

#### Prometheus метрики
- Создан `src/lib/metrics.ts` с:
  - `http_request_duration_seconds` (histogram)
  - `http_requests_total` (counter)
  - `active_users` (gauge)
  - `db_query_duration_seconds` (histogram)
- `GET /metrics` endpoint для сбора метрик
- Lazy инициализация `collectDefaultMetrics` — только при старте сервера

#### E2E тестирование
- Создан `tests/api.e2e.test.ts` с supertest
- `vitest.e2e.config.ts` для изолированного прогона
- `npm run test:e2e` команда

#### OpenAPI документация
- Добавлены cursor/limit параметры в spec для events, communities, chats, matches
- Добавлен `/metrics` endpoint в spec
- `PaginatedResponse` schema с `nextCursor` полем
- `CursorParam` / `LimitParam` reusable параметры

### Changed
- `src/app.ts` — переход на Redis-based rate limiter, добавлен metrics middleware
- `src/modules/events/events.routes.ts` — пагинация + параллельные запросы
- `src/modules/communities/communities.routes.ts` — пагинация
- `src/modules/chat/chat.routes.ts` — пагинация conversations и messages
- `src/modules/chat/chat.service.ts` — cursor/limit параметры
- `src/modules/communities/communities.service.ts` — cursor/limit параметры
- `src/modules/matching/matching.routes.ts` — пагинация matches
- `src/modules/search/search.routes.ts` — configurable limit + параллельные запросы
- `src/http/validation.ts` — добавлена `paginatedResponse` утилита
- `src/lib/redis.ts` — noop-клиент в test режиме
- `openapi.yaml` — полная документация пагинации, метрик
- `vitest.config.ts` — exclude e2e тестов из unit прогона

### Testing
- ✅ Все существующие тесты проходят (41 passed)
- ✅ Новые E2E тесты (health, metrics, auth, search, docs)

### Dependencies
- **Новые**: rate-limit-redis@4, prom-client, supertest, @types/supertest

---

## Фаза 1: Фундамент

### Added

#### Структурированное логирование
- Добавлен Pino logger для высокопроизводительного JSON логирования
- HTTP request logging с автоматическими request ID
- Модульные логгеры для разных частей приложения
- Pretty-print логи в development режиме
- Логирование lifecycle событий (startup, shutdown, errors)
- Обработка uncaughtException и unhandledRejection

#### Улучшенная обработка ошибок
- Расширенные HTTP error классы (BadRequestError, UnauthorizedError, NotFoundError, ConflictError, и т.д.)
- Коды ошибок для клиентов (BAD_REQUEST, UNAUTHORIZED, и т.д.)
- Request ID в каждом ответе с ошибкой
- Структурированное логирование всех ошибок
- Правильная типизация ошибок

#### Валидация
- Middleware для валидации body, query, params с Zod
- Общие переиспользуемые схемы (uuid, email, pagination, cursor)
- Автоматическая обработка Zod validation errors

#### Redis кэширование
- Настроен Redis клиент с автоматическим переподключением
- Graceful degradation - приложение работает без Redis
- Утилиты кэширования: get, set, delete, deletePattern
- Cache-aside pattern с `cacheGetOrSet`
- Кэширование compatibility scores (TTL 15 минут)
- Предопределенные TTL константы и префиксы
- Health check включает проверку Redis

#### Инфраструктура
- Graceful shutdown с закрытием всех соединений (HTTP, Redis, PostgreSQL)
- Улучшенный health check endpoint с проверкой DB и Redis
- Переменная окружения LOG_LEVEL для контроля уровня логирования

### Changed
- `src/app.ts` - добавлен HTTP logging middleware
- `src/server.ts` - улучшен lifecycle management
- `src/http/errors.ts` - расширены классы ошибок
- `src/modules/auth/auth.service.ts` - добавлено логирование
- `src/modules/discovery/compatibility.ts` - добавлено кэширование
- `.env.example` - добавлена переменная LOG_LEVEL

### Technical Details
- **Новые зависимости**: pino, pino-http, pino-pretty, redis
- **Новые dev зависимости**: @types/pino-http
- **Новые файлы**:
  - `src/lib/logger.ts` - logger utilities
  - `src/lib/redis.ts` - Redis client
  - `src/lib/cache.ts` - caching utilities
  - `src/http/validation.ts` - validation middleware
  - `docs/IMPROVEMENTS.md` - документация улучшений

### Testing
- ✅ Все существующие тесты проходят (41 passed)
- ✅ TypeScript компиляция без ошибок
- ✅ Совместимость с существующим кодом

### Performance Impact
- 🚀 Pino - один из самых быстрых логгеров для Node.js
- 🚀 Redis кэширование снижает нагрузку на PostgreSQL
- 🚀 Compatibility scores кэшируются, уменьшая вычисления

### Breaking Changes
- Нет breaking changes
- Все изменения обратно совместимы

---

## Следующие релизы

### Фаза 2: Production-готовность (планируется)
- Email delivery (полная интеграция Resend)
- S3/R2 медиа загрузка с presigned URLs
- Prometheus metrics для мониторинга
- CI/CD pipeline (GitHub Actions)
- Docker production образы

### Фаза 3: Оптимизация (планируется)
- Пагинация во всех list endpoints
- Оптимизация SQL запросов (N+1, индексы)
- Улучшенный rate limiting (Redis-based)
- Полная API документация
- E2E тесты
