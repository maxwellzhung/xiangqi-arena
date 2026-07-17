# Xiangqi engine

Pure TypeScript rules package for Han vs Chu. Positions are immutable, use a
flat row-major 9 x 10 board, and follow the repository coordinate system: Black
starts at row 0, Red starts at row 9, and Red moves first.

Serialization is Xiangqi-FEN-like: standard `rnbakabnr` piece letters, ten
slash-separated ranks from Black's side to Red's side, then `w` for Red or `b`
for Black. Only board state and side-to-move are encoded because those are the
inputs to legal move generation and repetition. Position hashes are stable
SHA-256 hashes of that serialization.

`getGameStatus` accepts previous positions or hashes, excluding the current
position. The default conservative policy declares a draw when the current
side-to-move position has occurred three times. This intentionally does not
implement tournament-specific perpetual-check or perpetual-chase adjudication;
alternate policies implement the exported `RepetitionPolicy` interface.
