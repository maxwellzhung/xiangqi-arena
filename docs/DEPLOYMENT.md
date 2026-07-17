# Deployment

## Sites preview

Install with `pnpm install`, run `pnpm dev`, validate with `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then publish through Sites. The root worker is Cloudflare-compatible and uses D1 through the logical `DB` binding.

## Container production

Run the web and realtime Docker images behind TLS, with managed PostgreSQL and Redis. Route HTTPS to the web container and disable proxy buffering for the game server’s `/v1/events` Server-Sent Events stream. Configure origin allowlists consistently on both services, run database migrations before rollout, and monitor `/healthz` and `/readyz`.

Rollback by redeploying the previous immutable image and only using backward-compatible migrations. Back up PostgreSQL with point-in-time recovery; Redis is disposable presence/queue state and should not be the sole durable store.

Required production values are documented in `.env.example`. Secrets must be injected by the platform and never committed.
