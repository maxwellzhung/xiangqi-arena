# Architecture

## Overview

The repository is a pnpm TypeScript workspace. The deployable web surface stays at the root to preserve the Sites/vinext Cloudflare Worker adapter. Pure domain packages live under `packages/`; the standalone realtime service lives under `apps/game-server/` for provider-neutral container deployment.

```text
Browser → vinext web/HTTP routes → D1 repository
       ↘ realtime gateway → authoritative game service → Postgres/Redis in container deployment
Shared Zod protocol ↔ pure Xiangqi engine ↔ web and game server
```

## Boundaries

- `packages/xiangqi-engine`: pure rules, serialization, status, notation, hashes; no framework dependencies.
- `packages/shared`: stable payload contracts and domain types.
- `app`: public product, local-play UI, account-aware pages, and Sites-compatible HTTP surfaces.
- `apps/game-server`: authoritative room, clock, matchmaking, idempotency, and completion services.
- `db`: normalized D1/SQLite deployment schema. PostgreSQL is the documented container-production target; models intentionally map one-to-one.

## State authority

The browser owns only presentation, tentative selection, and device preferences. The server owns legal moves, versions, sequence numbers, clocks, membership, completion, and ratings. Commands carry a UUID and expected game version; duplicates return the stored response.

## Scaling

A single realtime node can use in-memory presence in development. Production uses Redis TTLs for rooms, queue, presence, and fan-out, while durable games and command results are transactional in PostgreSQL. Sticky routing is optional when the Socket.IO Redis adapter is enabled.
