# Deployment

## Sites preview

Install with `pnpm install`, run `pnpm dev`, then execute `pnpm format:check`, `pnpm lint`, both root and game-server type checks, game-server tests, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, and `pnpm build`. Publish only the exact validated commit through Sites. The root worker serves both the product and `/api/v1/*`; `.openai/hosting.json` binds its durable game service to logical D1 database `DB`.

After Sites reports a successful deployment, smoke-test the deployed origin with two isolated browser sessions: create and join a private room, exchange moves, refresh one player, complete the game, and verify the replay and owner-only history. Keep the deployment private unless the release owner explicitly changes visibility.

## Container production

The container shape is not the validated durable MVP path yet. Before using it in production, implement the PostgreSQL and Redis adapters for the standalone server. Then run the web and realtime Docker images behind TLS, route HTTPS to the web container, disable proxy buffering for `/v1/events`, configure exact origin allowlists, run migrations before rollout, and monitor `/healthz` and `/readyz`.

Rollback by redeploying the previous immutable image and only using backward-compatible migrations. Back up PostgreSQL with point-in-time recovery; Redis is disposable presence/queue state and should not be the sole durable store.

Required production values are documented in `.env.example`. Secrets must be injected by the platform and never committed.
