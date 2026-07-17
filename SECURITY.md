# Security

## Threat model

Primary threats are forged moves or clocks, unauthorized game commands, replayed/duplicated commands, cross-site requests, room-code enumeration, payload abuse, token leakage, rating double-processing, and private-data exposure.

## Assumptions and controls

TLS terminates before the app. Strict payload schemas, origin/CORS allowlists, HTTP-only signed guest cookies, server-side membership checks, rate limits, payload caps, parameterized queries, version checks, command deduplication, redacted structured logs, and transactional completion protect core integrity.

Report vulnerabilities privately to the project security contact; do not open a public issue containing exploit details or credentials.

## Known limitations

The MVP repetition rule is not full tournament adjudication. The local development fallback is single-node. Strong anti-cheat analysis and public moderation are outside scope.

## Production-hardening checklist

- Rotate signing and provider secrets; use a managed secret store.
- Enforce TLS/HSTS, CSP, secure cookies, CORS and WebSocket origin allowlists.
- Configure distributed rate limiting and alerting.
- Run dependency, SAST, container, and migration checks in CI.
- Pen-test auth linking, reconnect tokens, room joins, and rating idempotency.
- Verify backups and rollback regularly.
