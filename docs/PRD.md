# Xiangqi Arena — Product Requirements

## Product promise

Xiangqi Arena is the easiest modern place for Western players to learn and play Xiangqi (Chinese Chess). A first-time visitor can begin a casual game as a guest, learn unfamiliar rules in plain English, and grow into rated play.

## Audience and outcomes

- Curious Western-chess players in the US, Canada, UK, and EU.
- Existing Xiangqi players who want a clean mobile-friendly board.
- New visitors should understand the game within one viewport and reach play in one action.
- Returning players should find private games, quick match, history, replay, settings, profiles, and rankings without jargon.

## MVP scope

Public landing, play lobby, private rooms, quick match, active game, learn, replay, leaderboard, profile, settings, privacy template, and terms template. Casual guest games are available immediately; rated play is account-only. Time controls are 5+0, 10+0, and 15+10.

Core integrity requirements are server-authoritative moves, clocks, results, and ratings; immutable engine transitions; idempotent commands; reconnection; durable game history; and accessible board controls.

## Success measures

- Landing-to-game-start conversion.
- Tutorial completion and first legal move rate.
- Private-room join success across two browsers.
- Reconnect success without state divergence.
- Completed-game persistence and replay availability.

## Exclusions

Public or spectator chat, voice, payments, prizes, tournaments, user-uploaded avatars, engine-based anti-cheat, and blockchain features.
