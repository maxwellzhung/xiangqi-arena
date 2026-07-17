# Xiangqi Rules Profile

The internal board is 9 columns × 10 rows. Row 0 is Black’s home side, row 9 is Red’s; Red moves first. The river is between rows 4 and 5. Black’s palace is rows 0–2/columns 3–5 and Red’s is rows 7–9/columns 3–5.

The engine implements General, Advisor, Elephant, Horse, Rook, Cannon, and Soldier movement, including flying generals, palace and river limits, elephant-eye and horse-leg blocks, cannon screens, self-check prevention, checkmate, and stalemate-as-loss.

Serialization is a documented Xiangqi-FEN-like board string plus active color. Position hashes derive from that stable serialization. The MVP repetition policy declares a draw when the same side-to-move position occurs three times. This conservative rule prevents infinite games but does not claim full tournament perpetual-check/chase adjudication.

Primary UI terms are Rook and Soldier. The glossary may also say Chariot and Pawn.
