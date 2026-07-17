import { describe, expect, it } from "vitest";
import {
  IllegalMoveError,
  InvalidPositionError,
  applyMove,
  conservativeThreefoldRepetitionPolicy,
  createInitialPosition,
  createPosition,
  createPositionHash,
  deserializePosition,
  explainMove,
  formatMove,
  generateLegalMoves,
  generatePseudoLegalMoves,
  getGameStatus,
  getPiece,
  hashString,
  isInCheck,
  isLegalMove,
  isSquareAttacked,
  serializePosition,
  validatePosition,
  type Color,
  type Move,
  type PlacedPiece,
  type Position,
  type Square,
} from "../src";

const sq = (column: number, row: number): Square => ({ column, row });
const mv = (
  fromColumn: number,
  fromRow: number,
  toColumn: number,
  toRow: number,
): Move => ({
  from: sq(fromColumn, fromRow),
  to: sq(toColumn, toRow),
});

function hasMove(
  moves: readonly Move[],
  toColumn: number,
  toRow: number,
): boolean {
  return moves.some(
    (move) => move.to.column === toColumn && move.to.row === toRow,
  );
}

function withSafeGenerals(
  extra: readonly PlacedPiece[],
  turn: Color = "red",
): Position {
  const pieces = [...extra];
  if (
    !pieces.some((piece) => piece.color === "black" && piece.type === "general")
  ) {
    pieces.push({ color: "black", type: "general", column: 3, row: 0 });
  }
  if (
    !pieces.some((piece) => piece.color === "red" && piece.type === "general")
  ) {
    pieces.push({ color: "red", type: "general", column: 5, row: 9 });
  }
  return createPosition(pieces, turn);
}

describe("position construction and validation", () => {
  it("creates and validates the complete initial setup", () => {
    const position = createInitialPosition();
    expect(position.turn).toBe("red");
    expect(position.board.filter(Boolean)).toHaveLength(32);
    expect(validatePosition(position)).toEqual({ valid: true, errors: [] });
    expect(serializePosition(position)).toBe(
      "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w",
    );
    expect(getPiece(position, sq(4, 0))).toEqual({
      color: "black",
      type: "general",
    });
    expect(getPiece(position, sq(4, 9))).toEqual({
      color: "red",
      type: "general",
    });
  });

  it("returns deeply frozen position state", () => {
    const position = createInitialPosition();
    expect(Object.isFrozen(position)).toBe(true);
    expect(Object.isFrozen(position.board)).toBe(true);
    expect(Object.isFrozen(getPiece(position, sq(0, 9)))).toBe(true);
  });

  it("rejects overlapping pieces and reports invalid placements", () => {
    expect(() =>
      createPosition([
        { color: "red", type: "general", column: 4, row: 9 },
        { color: "red", type: "rook", column: 4, row: 9 },
      ]),
    ).toThrow(InvalidPositionError);

    const invalid = createPosition([
      { color: "red", type: "general", column: 2, row: 9 },
      { color: "black", type: "general", column: 4, row: 0 },
      { color: "red", type: "elephant", column: 2, row: 3 },
    ]);
    expect(validatePosition(invalid).valid).toBe(false);
    expect(validatePosition(invalid).errors).toContain(
      "red general is outside its palace",
    );
    expect(validatePosition(invalid).errors).toContain(
      "red elephant has crossed the river",
    );
  });
});

describe("turns, captures, and global legality", () => {
  it("explains common illegal moves with stable player-facing reasons", () => {
    const initial = createInitialPosition();
    expect(explainMove(initial, mv(0, 0, 0, 1))).toMatchObject({
      legal: false,
      code: "wrong-turn",
    });
    expect(explainMove(initial, mv(0, 6, 0, 7))).toMatchObject({
      legal: false,
      code: "soldier-direction",
    });
    expect(explainMove(initial, mv(1, 9, 3, 8))).toMatchObject({
      legal: false,
      code: "horse-leg",
    });
    expect(explainMove(initial, mv(0, 6, 0, 5))).toEqual({
      legal: true,
      code: "legal",
      message: "Legal move.",
    });

    const cannon = withSafeGenerals([
      { color: "red", type: "cannon", column: 4, row: 5 },
      { color: "black", type: "rook", column: 4, row: 1 },
    ]);
    expect(explainMove(cannon, mv(4, 5, 4, 1))).toMatchObject({
      legal: false,
      code: "cannon-screen",
    });

    const exposed = createPosition([
      { color: "black", type: "general", column: 4, row: 0 },
      { color: "red", type: "rook", column: 4, row: 5 },
      { color: "red", type: "general", column: 4, row: 9 },
    ]);
    expect(explainMove(exposed, mv(4, 5, 3, 5))).toMatchObject({
      legal: false,
      code: "self-check",
    });
  });

  it("enforces Red-first turn order and alternates immutable states", () => {
    const initial = createInitialPosition();
    const blackRookMove = mv(0, 0, 0, 1);
    expect(isLegalMove(initial, blackRookMove)).toBe(false);
    expect(() => applyMove(initial, blackRookMove)).toThrow(IllegalMoveError);

    const next = applyMove(initial, mv(0, 6, 0, 5));
    expect(next.turn).toBe("black");
    expect(getPiece(initial, sq(0, 6))).toEqual({
      color: "red",
      type: "soldier",
    });
    expect(getPiece(next, sq(0, 5))).toEqual({ color: "red", type: "soldier" });
  });

  it("captures an enemy piece", () => {
    const position = withSafeGenerals([
      { color: "red", type: "rook", column: 0, row: 5 },
      { color: "black", type: "horse", column: 0, row: 2 },
    ]);
    const next = applyMove(position, mv(0, 5, 0, 2));
    expect(getPiece(next, sq(0, 2))).toEqual({ color: "red", type: "rook" });
    expect(getPiece(next, sq(0, 5))).toBeNull();
  });

  it("rejects capturing an allied piece", () => {
    const position = withSafeGenerals([
      { color: "red", type: "rook", column: 0, row: 5 },
      { color: "red", type: "horse", column: 0, row: 2 },
    ]);
    expect(hasMove(generatePseudoLegalMoves(position, sq(0, 5)), 0, 2)).toBe(
      false,
    );
    expect(() => applyMove(position, mv(0, 5, 0, 2))).toThrow(IllegalMoveError);
  });

  it("rejects a move that exposes its own general to the flying general", () => {
    const position = createPosition([
      { color: "black", type: "general", column: 4, row: 0 },
      { color: "red", type: "rook", column: 4, row: 5 },
      { color: "red", type: "general", column: 4, row: 9 },
    ]);
    const expose = mv(4, 5, 3, 5);
    expect(hasMove(generatePseudoLegalMoves(position, sq(4, 5)), 3, 5)).toBe(
      true,
    );
    expect(isLegalMove(position, expose)).toBe(false);
  });
});

describe("general and advisor", () => {
  it("keeps the general inside its own palace", () => {
    const center = createPosition([
      { color: "black", type: "general", column: 3, row: 0 },
      { color: "red", type: "general", column: 4, row: 8 },
    ]);
    const moves = generatePseudoLegalMoves(center, sq(4, 8));
    expect(moves.map((move) => move.to)).toEqual([
      sq(4, 7),
      sq(5, 8),
      sq(4, 9),
      sq(3, 8),
    ]);

    const edge = createPosition([
      { color: "black", type: "general", column: 4, row: 0 },
      { color: "red", type: "general", column: 3, row: 7 },
    ]);
    expect(
      generatePseudoLegalMoves(edge, sq(3, 7)).every(
        (move) => move.to.column >= 3 && move.to.row >= 7,
      ),
    ).toBe(true);
  });

  it("detects flying-general attack and permits flying capture", () => {
    const position = createPosition([
      { color: "black", type: "general", column: 4, row: 0 },
      { color: "red", type: "general", column: 4, row: 9 },
    ]);
    expect(isInCheck(position, "red")).toBe(true);
    expect(isInCheck(position, "black")).toBe(true);
    expect(isSquareAttacked(position, sq(4, 0), "red")).toBe(true);
    expect(hasMove(generateLegalMoves(position, sq(4, 9)), 4, 0)).toBe(true);

    const captured = applyMove(position, mv(4, 9, 4, 0));
    expect(getPiece(captured, sq(4, 0))).toEqual({
      color: "red",
      type: "general",
    });
    expect(getGameStatus(captured).result).toBe("red-win");
  });

  it("uses an intervening piece to block flying-general attack", () => {
    const position = createPosition([
      { color: "black", type: "general", column: 4, row: 0 },
      { color: "black", type: "soldier", column: 4, row: 4 },
      { color: "red", type: "general", column: 4, row: 9 },
    ]);
    expect(isInCheck(position, "red")).toBe(false);
    expect(isInCheck(position, "black")).toBe(false);
  });

  it("keeps advisors on one-step palace diagonals", () => {
    const position = createPosition([
      { color: "red", type: "advisor", column: 3, row: 9 },
    ]);
    expect(
      generatePseudoLegalMoves(position, sq(3, 9)).map((move) => move.to),
    ).toEqual([sq(4, 8)]);
  });
});

describe("elephant and horse blockers", () => {
  it("blocks an elephant at its eye", () => {
    const clear = createPosition([
      { color: "red", type: "elephant", column: 4, row: 9 },
    ]);
    expect(hasMove(generatePseudoLegalMoves(clear, sq(4, 9)), 2, 7)).toBe(true);

    const blocked = createPosition([
      { color: "red", type: "elephant", column: 4, row: 9 },
      { color: "black", type: "soldier", column: 3, row: 8 },
    ]);
    expect(hasMove(generatePseudoLegalMoves(blocked, sq(4, 9)), 2, 7)).toBe(
      false,
    );
    expect(hasMove(generatePseudoLegalMoves(blocked, sq(4, 9)), 6, 7)).toBe(
      true,
    );
  });

  it("does not let an elephant cross the river", () => {
    const red = createPosition([
      { color: "red", type: "elephant", column: 4, row: 5 },
    ]);
    expect(hasMove(generatePseudoLegalMoves(red, sq(4, 5)), 2, 3)).toBe(false);
    expect(hasMove(generatePseudoLegalMoves(red, sq(4, 5)), 2, 7)).toBe(true);

    const black = createPosition(
      [{ color: "black", type: "elephant", column: 4, row: 4 }],
      "black",
    );
    expect(hasMove(generatePseudoLegalMoves(black, sq(4, 4)), 6, 6)).toBe(
      false,
    );
    expect(hasMove(generatePseudoLegalMoves(black, sq(4, 4)), 6, 2)).toBe(true);
  });

  const horseCases = [
    { target: sq(3, 2), leg: sq(4, 3) },
    { target: sq(5, 2), leg: sq(4, 3) },
    { target: sq(6, 3), leg: sq(5, 4) },
    { target: sq(6, 5), leg: sq(5, 4) },
    { target: sq(5, 6), leg: sq(4, 5) },
    { target: sq(3, 6), leg: sq(4, 5) },
    { target: sq(2, 5), leg: sq(3, 4) },
    { target: sq(2, 3), leg: sq(3, 4) },
  ] as const;

  it.each(horseCases)(
    "applies horse-leg blocking for target $target",
    ({ target, leg }) => {
      const clear = createPosition([
        { color: "red", type: "horse", column: 4, row: 4 },
      ]);
      expect(
        hasMove(
          generatePseudoLegalMoves(clear, sq(4, 4)),
          target.column,
          target.row,
        ),
      ).toBe(true);
      const blocked = createPosition([
        { color: "red", type: "horse", column: 4, row: 4 },
        { color: "black", type: "soldier", column: leg.column, row: leg.row },
      ]);
      expect(
        hasMove(
          generatePseudoLegalMoves(blocked, sq(4, 4)),
          target.column,
          target.row,
        ),
      ).toBe(false);
    },
  );
});

describe("rook and cannon rays", () => {
  it("stops a rook at the first obstruction", () => {
    const position = createPosition([
      { color: "red", type: "rook", column: 4, row: 4 },
      { color: "red", type: "soldier", column: 4, row: 2 },
      { color: "black", type: "soldier", column: 4, row: 6 },
    ]);
    const moves = generatePseudoLegalMoves(position, sq(4, 4));
    expect(hasMove(moves, 4, 3)).toBe(true);
    expect(hasMove(moves, 4, 2)).toBe(false);
    expect(hasMove(moves, 4, 6)).toBe(true);
    expect(hasMove(moves, 4, 7)).toBe(false);
  });

  it("moves a cannon without capturing only before a screen", () => {
    const position = createPosition([
      { color: "red", type: "cannon", column: 4, row: 5 },
      { color: "red", type: "soldier", column: 4, row: 3 },
    ]);
    const moves = generatePseudoLegalMoves(position, sq(4, 5));
    expect(hasMove(moves, 4, 4)).toBe(true);
    expect(hasMove(moves, 4, 2)).toBe(false);
  });

  it("captures with exactly one cannon screen of either color", () => {
    for (const screenColor of ["red", "black"] as const) {
      const position = createPosition([
        { color: "red", type: "cannon", column: 4, row: 5 },
        { color: screenColor, type: "soldier", column: 4, row: 3 },
        { color: "black", type: "rook", column: 4, row: 1 },
      ]);
      expect(hasMove(generatePseudoLegalMoves(position, sq(4, 5)), 4, 1)).toBe(
        true,
      );
    }
  });

  it("rejects a cannon capture with zero screens", () => {
    const position = createPosition([
      { color: "red", type: "cannon", column: 4, row: 5 },
      { color: "black", type: "rook", column: 4, row: 1 },
    ]);
    expect(hasMove(generatePseudoLegalMoves(position, sq(4, 5)), 4, 1)).toBe(
      false,
    );
  });

  it("rejects a cannon capture with multiple screens", () => {
    const position = createPosition([
      { color: "red", type: "cannon", column: 4, row: 5 },
      { color: "red", type: "soldier", column: 4, row: 4 },
      { color: "red", type: "horse", column: 4, row: 3 },
      { color: "black", type: "rook", column: 4, row: 1 },
    ]);
    expect(hasMove(generatePseudoLegalMoves(position, sq(4, 5)), 4, 1)).toBe(
      false,
    );
  });
});

describe("soldier movement", () => {
  it("moves only forward before crossing the river", () => {
    const red = createPosition([
      { color: "red", type: "soldier", column: 4, row: 6 },
    ]);
    expect(
      generatePseudoLegalMoves(red, sq(4, 6)).map((move) => move.to),
    ).toEqual([sq(4, 5)]);
    const black = createPosition(
      [{ color: "black", type: "soldier", column: 4, row: 3 }],
      "black",
    );
    expect(
      generatePseudoLegalMoves(black, sq(4, 3)).map((move) => move.to),
    ).toEqual([sq(4, 4)]);
  });

  it("adds horizontal movement after crossing the river", () => {
    const red = createPosition([
      { color: "red", type: "soldier", column: 4, row: 4 },
    ]);
    expect(
      generatePseudoLegalMoves(red, sq(4, 4)).map((move) => move.to),
    ).toEqual([sq(4, 3), sq(3, 4), sq(5, 4)]);
    const black = createPosition(
      [{ color: "black", type: "soldier", column: 4, row: 5 }],
      "black",
    );
    expect(
      generatePseudoLegalMoves(black, sq(4, 5)).map((move) => move.to),
    ).toEqual([sq(4, 6), sq(3, 5), sq(5, 5)]);
  });

  it("never permits a backward soldier move", () => {
    const red = withSafeGenerals([
      { color: "red", type: "soldier", column: 4, row: 4 },
    ]);
    expect(isLegalMove(red, mv(4, 4, 4, 5))).toBe(false);
    const black = withSafeGenerals(
      [{ color: "black", type: "soldier", column: 4, row: 5 }],
      "black",
    );
    expect(isLegalMove(black, mv(4, 5, 4, 4))).toBe(false);
  });
});

describe("check and terminal status", () => {
  it("detects rook, cannon, and horse checks including their blockers", () => {
    const rookCheck = createPosition([
      { color: "black", type: "general", column: 3, row: 0 },
      { color: "black", type: "rook", column: 4, row: 5 },
      { color: "red", type: "general", column: 4, row: 9 },
    ]);
    expect(isInCheck(rookCheck, "red")).toBe(true);

    const cannonCheck = createPosition([
      { color: "black", type: "general", column: 3, row: 0 },
      { color: "black", type: "cannon", column: 4, row: 3 },
      { color: "red", type: "soldier", column: 4, row: 6 },
      { color: "red", type: "general", column: 4, row: 9 },
    ]);
    expect(isInCheck(cannonCheck, "red")).toBe(true);

    const horseCheck = createPosition([
      { color: "black", type: "general", column: 3, row: 0 },
      { color: "black", type: "horse", column: 3, row: 7 },
      { color: "red", type: "general", column: 4, row: 9 },
    ]);
    expect(isInCheck(horseCheck, "red")).toBe(true);
    const blockedHorse = createPosition([
      { color: "black", type: "general", column: 3, row: 0 },
      { color: "black", type: "horse", column: 3, row: 7 },
      { color: "red", type: "soldier", column: 3, row: 8 },
      { color: "red", type: "general", column: 4, row: 9 },
    ]);
    expect(isInCheck(blockedHorse, "red")).toBe(false);
  });

  it("adjudicates checkmate as a loss", () => {
    const mate = createPosition(
      [
        { color: "black", type: "rook", column: 3, row: 0 },
        { color: "black", type: "general", column: 4, row: 0 },
        { color: "black", type: "rook", column: 5, row: 0 },
        { color: "red", type: "rook", column: 3, row: 1 },
        { color: "red", type: "rook", column: 4, row: 1 },
        { color: "red", type: "general", column: 4, row: 9 },
      ],
      "black",
    );
    expect(generateLegalMoves(mate)).toHaveLength(0);
    expect(getGameStatus(mate)).toEqual({
      status: "checkmate",
      isTerminal: true,
      turn: "black",
      inCheck: true,
      winner: "red",
      result: "red-win",
      terminationReason: "checkmate",
      repetitionCount: 0,
    });
  });

  it("adjudicates no-legal-move stalemate as a loss", () => {
    const stalemate = createPosition(
      [
        { color: "black", type: "general", column: 4, row: 0 },
        { color: "red", type: "rook", column: 3, row: 1 },
        { color: "red", type: "rook", column: 5, row: 1 },
        { color: "red", type: "general", column: 3, row: 9 },
      ],
      "black",
    );
    expect(isInCheck(stalemate, "black")).toBe(false);
    expect(generateLegalMoves(stalemate)).toHaveLength(0);
    expect(getGameStatus(stalemate).status).toBe("stalemate");
    expect(getGameStatus(stalemate).result).toBe("red-win");
  });
});

describe("serialization, hashing, notation, and repetition", () => {
  it("preserves engine invariants across deterministic legal-play playouts", () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      let randomState = seed * 0x9e3779b1;
      const nextRandom = () => {
        randomState ^= randomState << 13;
        randomState ^= randomState >>> 17;
        randomState ^= randomState << 5;
        return randomState >>> 0;
      };
      let position = createInitialPosition();
      const hashes = new Set<string>();

      for (let ply = 0; ply < 80; ply += 1) {
        const validation = validatePosition(position, {
          requireBothGenerals: false,
        });
        expect(validation.errors, `seed ${seed}, ply ${ply}`).toEqual([]);
        const serialized = serializePosition(position);
        expect(deserializePosition(serialized)).toEqual(position);
        expect(createPositionHash(position)).toBe(hashString(serialized));
        hashes.add(createPositionHash(position));

        const moves = generateLegalMoves(position);
        if (moves.length === 0) break;
        for (const candidate of moves.slice(0, 5)) {
          expect(isLegalMove(position, candidate)).toBe(true);
        }
        const turn = position.turn;
        const chosen = moves[nextRandom() % moves.length];
        const next = applyMove(position, chosen);
        expect(next.turn).toBe(turn === "red" ? "black" : "red");
        expect(Object.isFrozen(next)).toBe(true);
        expect(Object.isFrozen(next.board)).toBe(true);
        position = next;
      }

      expect(hashes.size).toBeGreaterThan(5);
    }
  });

  it("round-trips stable serialization", () => {
    const initial = createInitialPosition();
    const value = serializePosition(initial);
    const restored = deserializePosition(value);
    expect(restored).toEqual(initial);
    expect(serializePosition(restored)).toBe(value);
    expect(createPositionHash(restored)).toBe(createPositionHash(initial));
  });

  it("rejects malformed serialized positions", () => {
    expect(() => deserializePosition("9/9 w")).toThrow(InvalidPositionError);
    expect(() => deserializePosition("9/9/9/9/9/9/9/9/9/8x w")).toThrow(
      InvalidPositionError,
    );
    expect(() => deserializePosition("9/9/9/9/9/9/9/9/9/9 red")).toThrow(
      InvalidPositionError,
    );
  });

  it("uses a standards-correct stable SHA-256 implementation", () => {
    expect(hashString("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(createPositionHash(createInitialPosition())).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it("formats UCCI, coordinate, and Western-facing notation", () => {
    const position = createInitialPosition();
    const move = mv(0, 9, 0, 8);
    expect(formatMove(position, move, "ucci")).toBe("a0a1");
    expect(formatMove(position, move, "coordinate")).toBe("a0-a1");
    expect(formatMove(position, move, "western")).toBe("Rook a0-a1");
  });

  it("declares a conservative draw on the third same-side position", () => {
    const position = createInitialPosition();
    const serialized = serializePosition(position);
    const hash = createPositionHash(position);
    const status = getGameStatus(position, [serialized, hash]);
    expect(status.status).toBe("repetition");
    expect(status.result).toBe("draw");
    expect(status.repetitionCount).toBe(3);
    expect(conservativeThreefoldRepetitionPolicy.id).toBe(
      "conservative-threefold-position-v1",
    );
  });

  it("does not conflate identical boards with different sides to move", () => {
    const red = createInitialPosition();
    const black = deserializePosition(
      serializePosition(red).replace(/ w$/, " b"),
    );
    expect(createPositionHash(black)).not.toBe(createPositionHash(red));
    expect(getGameStatus(red, [black, red]).status).toBe("active");
  });
});
