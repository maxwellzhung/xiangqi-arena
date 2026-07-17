# Architecture

## Overview

The repository is a pnpm TypeScript workspace. The deployable web and game API stay at the root to preserve the Sites/vinext Cloudflare Worker adapter and same-origin security boundary. Pure domain packages live under `packages/`; the standalone service under `apps/game-server/` is a provider-neutral reference deployment.

```text
Browser → vinext pages → same-origin /api/v1 HTTP + SSE
                         → durable game service → D1 transaction boundary
Shared Zod protocol ↔ pure Xiangqi engine ↔ Sites service / standalone server
```

## Boundaries

- `packages/xiangqi-engine`: pure rules, serialization, status, notation, hashes; no framework dependencies.
- `packages/shared`: stable payload contracts and domain types.
- `app`: public product, local-play UI, account-aware pages, same-origin game API, and the D1-backed authoritative service.
- `apps/game-server`: provider-neutral room, clock, matchmaking, idempotency, and completion reference service; its current repository is in-memory.
- `db` and `drizzle`: normalized D1/SQLite deployment schema, migrations, and database-level concurrency guards. PostgreSQL remains the documented target for a future durable container adapter.

## State authority

The browser owns only presentation, tentative selection, and device preferences. The server owns legal moves, versions, sequence numbers, clocks, membership, completion, and ratings. Commands carry a UUID and expected game version; duplicates return the stored response. Guest identity is held in a secure, HTTP-only, same-site cookie, while reconnect capability is rotated by the service.

## Scaling

The validated MVP runs as a Sites worker with D1-backed rooms, queue claims, games, moves, negotiations, event outbox, deduplication, and history. Version predicates and database triggers prevent stale commands, expired-room claims, and invalid queue claims. A future multi-node container deployment should move durable records and command results to PostgreSQL and reconstructable presence/fan-out to Redis; those adapters are not yet implemented.
