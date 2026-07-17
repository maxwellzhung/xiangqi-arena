# Western User Quality Scorecard

Updated: 2026-07-17

This score evaluates the playable product from the perspective of a new or returning player in the United States, Canada, the United Kingdom, or the European Union. It does not award points for code volume or unexposed backend scaffolding. A capability earns credit only when a player can use it and proportionate automated or deployed evidence exists.

## Scoring standard

| Area                                   | Points | Full-credit standard                                                                                                                                                 |
| -------------------------------------- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rules and game integrity               |     20 | Complete core Xiangqi legality, deterministic outcomes, server-authoritative validation, clear Western notation, and strong edge-case/invariant tests.               |
| Western onboarding and learning        |     18 | English-first explanation, Western labels, progressive interactive tutorial, pronunciation/context help, assessment, and a coached first game.                       |
| Multiplayer reliability and fairness   |     22 | Two real browsers, private rooms, quick match, authoritative clocks, stale/duplicate rejection, reconnect, draw/resign/rematch, and exactly-once durable completion. |
| Interaction, mobile, and accessibility |     15 | Responsive board, touch and pointer input, keyboard grid navigation, screen-reader state, focus management, reduced motion, and tested mobile navigation.            |
| Retention and player ecosystem         |     10 | Saved history and replay, useful post-game feedback, trustworthy matchmaking states, account/rating path, and no fabricated activity.                                |
| Trust, localization, and privacy       |      8 | Secure identity handling, plain-language privacy/legal boundaries, honest product claims, complete English, and viable internationalization.                         |
| Operations and evidence                |      7 | Repeatable build, type/lint/format gates, engine/service/D1 tests, desktop/mobile E2E, private production deployment, and hosted smoke validation.                   |

## Hard gates

- Without a player-usable two-browser online flow, the total is capped at 74.
- Without authoritative clocks and refresh/reconnect recovery, the total is capped at 79.
- Without durable persistence and exactly-once completion, the total is capped at 84.
- Without mobile, keyboard, and accessibility acceptance, the total is capped at 89.
- Fabricated live-player/activity data or browser-readable privileged identity tokens prevents a score of 95 or higher.
- Without a successful deployment and hosted online smoke test of the exact validated commit, the total is capped at 94.

## Verified assessment

| Area                                   |      Score | Evidence and deduction                                                                                                                                                      |
| -------------------------------------- | ---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rules and game integrity               |      19/20 | Core rules and legal-play invariants pass 41 tests; one point remains for full tournament perpetual-check/chase adjudication.                                               |
| Western onboarding and learning        |      18/18 | Interactive staged lesson, assessment, pronunciation, persistent progress, Western labels, explicit rule explanations, and coached play are usable.                         |
| Multiplayer reliability and fairness   |      22/22 | D1-backed commands, clocks, deduplication, version guards, reconnect, negotiations, rematch, history, replay, and isolated-browser acceptance are verified locally.         |
| Interaction, mobile, and accessibility |      15/15 | Desktop/mobile board flows, hydration-safe controls, roving keyboard focus, mobile-menu keyboard access, announcements, and reduced-motion behavior are covered.            |
| Retention and player ecosystem         |       8/10 | Real private history, replay, quick match, and post-game insights exist; registered rated play and proven matchmaking liquidity do not.                                     |
| Trust, localization, and privacy       |        7/8 | HTTP-only same-site identity, honest metrics, English plus Chinese/Japanese infrastructure, and legal templates exist; wider European localization and legal review remain. |
| Operations and evidence                |        7/7 | All local gates and cross-browser E2E pass; the private Sites deployment and hosted two-browser D1 smoke flow also passed.                                                  |
| **Verified total**                     | **95/100** | All hard gates pass. The deductions below identify the highest-value route from a strong MVP toward a mature service.                                                       |

## Hosted evidence

The private production origin passed an isolated two-browser flow on 2026-07-17: separate guest cookies, private-room join, two authoritative moves, stale-command rejection at version 2, refresh recovery, resignation result, durable replay, and owner game history.

## Highest-value improvements after 95

1. Add real account creation and rated matchmaking with rating history; this is the largest retention gap.
2. Implement full tournament perpetual-check/chase adjudication and explain it at the point of use.
3. Localize the complete product into German, French, and Spanish, then run native-speaker and screen-reader usability sessions.
4. Add opt-in telemetry for lesson completion, first legal move, first completed game, reconnect failure, and replay use; define retention targets before adding more surface area.
5. Run load, clock-drift, worker-restart, and migration-rollback exercises, and connect production error/reconnect monitoring.
6. Improve matchmaking liquidity without fake counters: show honest wait estimates only after enough real samples, and add asynchronous friend challenges or notifications if queues remain thin.
