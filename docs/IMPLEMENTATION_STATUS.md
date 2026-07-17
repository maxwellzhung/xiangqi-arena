# Implementation Status

Updated: 2026-07-17

## Phase 1 — Foundation

- Completed — Repository inspection and Sites/vinext initialization.
- Completed — Product, architecture, rules, protocol, decision, and deployment documents.
- Completed — pnpm workspace, strict shared contracts, database/Redis development environment, CI, brand, and English-first foundation.

## Phase 2 — Xiangqi engine

- Completed — Pure board model, move generation, legal filtering, status, serialization, hashing, notation, repetition policy, move explanations, deterministic legal-play invariants, and 41 unit tests.

## Phase 3 — Local playable interface

- Completed — Responsive accessible board, legal destinations, local game, move history, captures, settings, two piece styles, replay, and interactive learning.

## Phase 4 — Private realtime games

- Completed — Same-origin `/api/v1/*` game service, secure HTTP-only guest sessions, private rooms, quick match, server-authoritative clocks and moves, draw/resign/rematch, reconnect token rotation, idempotency, version guards, 20-table D1 schema, concurrency triggers, and 21 game-server tests.
- Completed — Two isolated browsers can create and join a room, exchange legal moves, reject a stale command, observe clocks, refresh and recover, resign, and open the saved replay and profile history.
- Blocked — The optional provider-neutral container service still needs PostgreSQL/Redis durable adapters before it can be used as a production alternative to Sites/D1.

## Phase 5 — Accounts and matchmaking

- Blocked — Google OAuth/passwordless credentials are unavailable; hosted ChatGPT sign-in is optional, guest/local play remains functional, and provider variables are documented.
- Completed — Guest quick match, device-bound history, member-only replay, rated guard, Elo foundation, and exactly-once completion ledger are implemented on the durable D1 path.
- Blocked — Registered rated play remains unavailable until an external account provider is configured.

## Phase 6 — Product polish

- Completed — English-first onboarding, interactive learning and assessment, Western piece labels, responsive behavior, semantic and keyboard interaction, screen-reader game announcements, hydration-safe controls, focus restoration, reduced motion, security baseline, CI, container definitions, and legal templates.

## Validation

- Completed — `pnpm format:check` passed.
- Completed — `pnpm lint` passed with zero errors.
- Completed — Root, engine, and game-server TypeScript checks passed.
- Completed — Engine unit tests: 41/41 passed.
- Completed — Game-server unit/integration tests: 21/21 passed.
- Completed — D1 migration/concurrency and rendered-route integration tests: 8/8 passed.
- Completed — Production vinext build passed with all ten product routes.
- Completed — Playwright browser acceptance: 10/10 passed across desktop Chromium and mobile WebKit, including local play, illegal-move guidance, roving board focus, mobile-menu keyboard navigation, and the complete two-browser online/history/replay flow.
- Completed — Real Miniflare/D1 API flow verified separate cookie identities, room join, moves, deduplication, stale-version rejection, SSE snapshots/clocks, draw, rematch color swap, reconnect token rotation, and private history.
- Blocked — Docker/Compose runtime validation was not run because Docker is unavailable in this environment.
