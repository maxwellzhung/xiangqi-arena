# 楚汉 / Han vs Chu

Han vs Chu is an English-first Dynasty Chess product for Western players. The
MVP combines an approachable learning and local-play experience with a pure
TypeScript rules engine, shared realtime contracts, and a provider-neutral
authoritative game-server foundation.

The repository is production-oriented scaffolding, not a claim that every
product flow is production-complete. See [Current limitations](#current-limitations)
and [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) before a
release.

## Repository map

```text
app/                       vinext/Next.js web product and public routes
apps/game-server/          authoritative HTTP/realtime service
packages/xiangqi-engine/   framework-free Xiangqi rules engine
packages/shared/           validated shared contracts and domain types
db/ and drizzle/           Sites/D1 schema and migrations
tests/                     root integration and rendered-output checks
docs/                      product, architecture, protocol, rules, and ops docs
```

The browser owns presentation only. Legal moves, game versions, clocks,
membership, results, and ratings belong to the authoritative service boundary.

## Prerequisites

- Node.js 22.13 or newer
- [pnpm 11.9](https://pnpm.io/)
- Docker with Compose v2, if running local PostgreSQL and Redis

Enable the repository's pinned package manager with `corepack enable` if pnpm
is not already available.

## Quick start

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d --wait
pnpm dev
```

The web app defaults to <http://localhost:3000>. Start the realtime service in
a second terminal:

```bash
pnpm --dir apps/game-server dev
```

It defaults to <http://localhost:3001>. Its liveness and dependency-readiness
checks are `GET /healthz` and `GET /readyz`.

PostgreSQL and Redis are started because they are the intended durable and
distributed production adapters. The current MVP realtime repository is
in-memory and does not consume `DATABASE_URL` or `REDIS_URL` yet, so the game
server remains runnable when those containers are absent. State is lost when
the realtime process restarts.

To stop local dependencies without deleting data:

```bash
docker compose down
```

To also remove local database and Redis volumes:

```bash
docker compose down --volumes
```

## Environment

`.env.example` is the source of truth for supported and reserved settings. The
important local values are:

| Variable                      | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_GAME_SERVER_URL` | Browser-visible realtime server URL                           |
| `PUBLIC_WEB_ORIGIN`           | Canonical origin used to generate private-room join links     |
| `HOST`, `PORT`                | Realtime bind address and service-specific port               |
| `GAME_SERVER_ALLOWED_ORIGINS` | Exact comma-separated HTTP/realtime origin allowlist          |
| `DATABASE_URL`                | Reserved PostgreSQL adapter connection string                 |
| `REDIS_URL`                   | Reserved queue, presence, fan-out, and rate-limit adapter URL |
| `SESSION_SECRET`              | Production-only guest/session signing secret                  |

Do not put production secrets in `.env`, container images, client-prefixed
variables, or source control. Inject secrets at runtime through the deployment
platform. A production origin allowlist must contain exact HTTPS origins; never
use `*` for credentialed HTTP or WebSocket traffic.

## Commands

| Command                           | What it does                                     |
| --------------------------------- | ------------------------------------------------ |
| `pnpm dev`                        | Runs the web development server                  |
| `pnpm --dir apps/game-server dev` | Runs the realtime service in watch mode          |
| `pnpm build`                      | Builds the production web worker/bundle          |
| `pnpm start`                      | Starts the built web app                         |
| `pnpm lint`                       | Runs ESLint                                      |
| `pnpm typecheck`                  | Runs strict TypeScript checks                    |
| `pnpm format`                     | Formats repository files                         |
| `pnpm format:check`               | Verifies formatting without writing              |
| `pnpm test`                       | Runs unit and integration suites                 |
| `pnpm test:unit`                  | Runs package-level unit tests                    |
| `pnpm test:integration`           | Runs repository integration tests                |
| `pnpm test:e2e`                   | Runs the separate Playwright browser suite       |
| `pnpm db:generate`                | Generates a Drizzle migration from the D1 schema |
| `pnpm db:migrate`                 | Applies configured Drizzle migrations            |
| `pnpm db:seed`                    | Reserved for a development seed adapter          |
| `pnpm db:reset`                   | Reserved for a destructive development reset     |

The root Drizzle schema targets Sites/D1. Inspect a generated migration before
applying it. `db:seed` and `db:reset` are script contracts, but their adapters
are not implemented in the current MVP; they must fail visibly rather than
silently mutating the wrong store. Never run a reset against shared or
production data.

## Quality assurance

Run the same non-browser gates as CI before opening a pull request:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

Browser E2E is intentionally separate because it needs both web and realtime
processes plus two isolated browser contexts:

```bash
pnpm test:e2e
```

Do not interpret a green unit/integration pipeline as proof that the two-browser
reconnect, clock, resignation, rematch, or replay journey passed. E2E status is
recorded explicitly in `docs/IMPLEMENTATION_STATUS.md`.

## Containers

Build the web image from the repository root:

```bash
docker build -f Dockerfile.web -t hanvschu-web .
```

Build the realtime image separately:

```bash
docker build -f apps/game-server/Dockerfile -t hanvschu-game-server .
```

`docker-compose.yml` deliberately runs development dependencies only. Keeping
application processes outside Compose preserves fast hot reload and makes the
same Postgres/Redis services usable by tests. The database and cache bind to
loopback by default; do not expose their ports publicly.

## Deployment

Two supported shapes share the same domain boundaries:

1. **Sites:** build the root vinext application and publish its
   Cloudflare-compatible worker. Logical D1/R2 bindings live in
   `.openai/hosting.json`; runtime values are managed by Sites.
2. **Provider-neutral containers:** run immutable web and game-server images
   behind a TLS-terminating reverse proxy, with managed PostgreSQL and managed
   Redis on private networks.

For a container deployment:

- Route ordinary HTTPS requests to web port 3000.
- Route the realtime API to port 3001. Disable proxy buffering and extend idle
  timeouts for the current `/v1/events` Server-Sent Events stream. Preserve
  forwarding and request-ID headers, and preserve `Upgrade`/`Connection`
  headers when a WebSocket transport is introduced.
- Configure identical canonical public URLs and strict origin allowlists.
- Run backward-compatible database migrations as a release job before shifting
  traffic.
- Check game-server `/healthz` for process liveness and `/readyz` for readiness.
- Drain connections and allow graceful shutdown before terminating an old
  realtime replica.
- Keep durable game/result data in PostgreSQL. Treat Redis presence, queue, and
  rate-limit state as reconstructable unless persistence is explicitly enabled.

Use immutable image tags or digests. Roll back by routing traffic to the
previous known-good images; never reverse a destructive migration during an
incident. Prefer expand/migrate/contract schema changes so old and new versions
can overlap safely.

Back up PostgreSQL with encrypted, provider-managed snapshots and point-in-time
recovery. Define retention and region requirements, monitor backup failures,
and perform restoration drills. Redis is not the authoritative game record.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the concise release runbook.

## Security baseline

- Terminate TLS before both services and enable HSTS in production.
- Validate every HTTP and realtime payload with strict schemas and size limits.
- Authorize every game command server-side; never trust client clocks, colors,
  ratings, results, or versions.
- Use secure, HTTP-only, same-site signed cookies for guest identity.
- Apply CSRF protection to cookie-authenticated mutations and validate redirect
  targets.
- Rate-limit authentication, room creation, matchmaking, and realtime commands
  in a distributed store.
- Redact cookies, authorization headers, tokens, and connection strings from
  structured logs.
- Use least-privilege database credentials and rotate all signing/provider
  secrets.
- Scan dependencies and images, patch supported base images, and monitor
  health, error rates, reconnects, clock drift, and duplicate-command rates.

Report suspected vulnerabilities privately according to [`SECURITY.md`](SECURITY.md).
Privacy and terms pages in the product are templates only and require
professional legal review; they do not guarantee GDPR, CCPA, or other legal
compliance.

## Current limitations

- The realtime service uses in-memory repositories. PostgreSQL and Redis
  adapters, horizontal fan-out, and restart recovery are not complete.
- Guest sessions currently return a signed bearer token. Production should
  move that token behind a secure, HTTP-only, same-site cookie or an equivalent
  hardened backend-for-frontend boundary before handling sensitive accounts.
- Full account registration, Google OAuth, passwordless email, and production
  rating history require external credentials and durable adapters. Guest and
  casual flows are the usable MVP path.
- The threefold-repetition policy is a deterministic MVP approximation, not
  full tournament perpetual-check/chase adjudication.
- Advanced anti-cheat, tournaments, payments, public chat, voice, and spectator
  chat are intentionally out of scope.
- Legal/privacy copy is a review-required template.
- A production-like two-browser E2E result must not be claimed unless the
  standalone web and realtime stack was actually exercised.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — product scope and acceptance criteria
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — boundaries and state authority
- [`docs/XIANGQI_RULES.md`](docs/XIANGQI_RULES.md) — coordinate system and rules
- [`docs/REALTIME_PROTOCOL.md`](docs/REALTIME_PROTOCOL.md) — commands, events, and idempotency
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — important tradeoffs
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) — honest phase/test status
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deployment and rollback summary
