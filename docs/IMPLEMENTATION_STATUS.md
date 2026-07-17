# Implementation Status

Updated: 2026-07-17

## Phase 1 — Foundation

- Completed — Repository inspection and Sites/vinext initialization.
- Completed — Product, architecture, rules, protocol, decision, and deployment documents.
- Completed — pnpm workspace, strict shared contracts, database/Redis development environment, CI, brand, and English-first foundation.

## Phase 2 — Xiangqi engine

- Completed — Pure board model, move generation, legal filtering, status, serialization, hashing, notation, repetition policy, and 38 unit tests.

## Phase 3 — Local playable interface

- Completed — Responsive accessible board, legal destinations, local game, move history, captures, settings, two piece styles, replay, and interactive learning.

## Phase 4 — Private realtime games

- Completed — Signed guest sessions, private-room and matchmaking services, server-authoritative clocks and moves, draw/resign/rematch, reconnect presence, idempotency, 12-table D1 schema, migrations, and 20 service tests.
- Blocked — The hosted web UI is not connected to the standalone HTTP/SSE game service; its private-room panel labels that requirement explicitly. Production PostgreSQL/Redis adapters and restart recovery remain post-MVP integration work.

## Phase 5 — Accounts and matchmaking

- Blocked — Google OAuth/passwordless credentials are unavailable; hosted ChatGPT sign-in is optional, guest/local play remains functional, and provider variables are documented.
- In progress — Queue service, rated guard, Elo and exactly-once ledger are implemented; leaderboard, profile, history, and replay product surfaces are implemented, but durable production adapters are not connected.

## Phase 6 — Product polish

- Completed — Responsive behavior, semantic and keyboard interaction, screen-reader game announcements, focus restoration, reduced motion, security baseline, CI, container definitions, legal templates, and final non-browser validation.

## Validation

- Completed — `pnpm format:check` passed.
- Completed — `pnpm lint` passed with zero errors.
- Completed — Root, engine, and game-server TypeScript checks passed.
- Completed — Engine unit tests: 38/38 passed.
- Completed — Game-server unit/integration tests: 20/20 passed.
- Completed — Rendered-route integration tests: 3/3 passed.
- Completed — Production vinext build passed with all ten product routes.
- Completed — Mobile-width DOM validation confirmed the landing and play lobby render with accessible names and navigation.
- Blocked — Automated two-browser Playwright E2E was authored but not executed; the in-app browser connection closed during the local-game click-through, and the standalone realtime deployment is not connected.
- Blocked — Docker/Compose runtime validation was not run because Docker is unavailable in this environment.
