# Realtime Protocol

All messages use the shared strict Zod contracts in `packages/shared`. Unknown fields are rejected. Every mutation has a client-generated UUID; game mutations also carry the expected game version.

## Move transaction

1. Authenticate guest or account session and rate-limit the command.
2. Verify game membership, turn, status, and expected version.
3. Update the moving clock from monotonic server time.
4. Validate and apply through the pure engine.
5. In one database transaction insert deduplication response and move, update game/version/clocks, and complete once if terminal.
6. Commit, then broadcast the authoritative snapshot.

Duplicate command IDs return the stored response. Stale versions are rejected with a fresh snapshot. Reconnect tokens are rotated, presence has a 30-second grace period, abandoned waiting rooms expire after 30 minutes, and heartbeats run every 15 seconds with a 45-second liveness timeout.
