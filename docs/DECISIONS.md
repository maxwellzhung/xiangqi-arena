# Decisions

| Decision       | Choice                                                          | Reason                                                                                                                              |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Brand          | 楚汉 / Han vs Chu · “Dynasty Chess”                             | Ownable bilingual identity rooted in the board's Chu–Han river divide, with an approachable English descriptor.                     |
| Web deployment | Preserve root vinext/Sites app                                  | Required for the requested Sites deployment while keeping domain packages portable.                                                 |
| Persistence    | D1 binding for Sites; PostgreSQL model for container deployment | The product needs durable records, and the domain schema is provider-neutral.                                                       |
| Guest identity | Signed, secure, HTTP-only cookie created server-side            | Survives refresh without exposing privileged identifiers.                                                                           |
| Repetition     | Three occurrences of identical position + side to move = draw   | Conservative, deterministic MVP policy; not full tournament chase/perpetual-check law.                                              |
| Rating         | Elo 1500 initial, K=32 under 30 rated games, K=20 thereafter    | Responsive onboarding with calmer established ratings. Updates are one transaction per completed rated game.                        |
| Reconnect      | 30-second grace with snapshot resync                            | Handles brief mobile/network drops without indefinite abandoned games.                                                              |
| Piece style    | Western labels by default, traditional characters optional      | Minimizes the learning barrier without removing authentic notation.                                                                 |
| Public auth    | Guest-first; ChatGPT identity is optional on hosted preview     | External OAuth credentials are unavailable and Sites forbids inventing an app-owned auth stack. Production adapters are documented. |
