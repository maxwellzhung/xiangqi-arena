import { generatePseudoLegalMoves, isLegalMove } from "./moves";
import { getPiece, isSquareOnBoard } from "./position";
import type {
  Move,
  MoveLegalityCode,
  MoveLegalityExplanation,
  Piece,
  Position,
  Square,
} from "./types";

function explanation(
  legal: boolean,
  code: MoveLegalityCode,
  message: string,
): MoveLegalityExplanation {
  return Object.freeze({ legal, code, message });
}

function sameSquare(first: Square, second: Square): boolean {
  return first.column === second.column && first.row === second.row;
}

function isInPalace(square: Square, color: Piece["color"]): boolean {
  if (square.column < 3 || square.column > 5) return false;
  return color === "red"
    ? square.row >= 7 && square.row <= 9
    : square.row >= 0 && square.row <= 2;
}

function countPiecesBetween(
  position: Position,
  from: Square,
  to: Square,
): number {
  if (from.column !== to.column && from.row !== to.row) return 0;
  const columnStep = Math.sign(to.column - from.column);
  const rowStep = Math.sign(to.row - from.row);
  let count = 0;
  for (
    let column = from.column + columnStep, row = from.row + rowStep;
    column !== to.column || row !== to.row;
    column += columnStep, row += rowStep
  ) {
    if (getPiece(position, { column, row })) count += 1;
  }
  return count;
}

function piecePatternExplanation(
  position: Position,
  candidate: Move,
  piece: Piece,
): MoveLegalityExplanation {
  const { from, to } = candidate;
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const absColumn = Math.abs(columnDelta);
  const absRow = Math.abs(rowDelta);
  const destination = getPiece(position, to);

  switch (piece.type) {
    case "general": {
      if (!isInPalace(to, piece.color)) {
        const flyingCapture =
          destination?.type === "general" &&
          destination.color !== piece.color &&
          columnDelta === 0 &&
          countPiecesBetween(position, from, to) === 0;
        if (!flyingCapture) {
          return explanation(
            false,
            "palace-boundary",
            "The General must stay inside its 3×3 palace, except for a clear flying-General capture.",
          );
        }
      }
      return explanation(
        false,
        "piece-pattern",
        "The General moves one intersection horizontally or vertically inside the palace.",
      );
    }
    case "advisor":
      if (!isInPalace(to, piece.color)) {
        return explanation(
          false,
          "palace-boundary",
          "The Advisor cannot leave its 3×3 palace.",
        );
      }
      return explanation(
        false,
        "piece-pattern",
        "The Advisor moves exactly one intersection diagonally.",
      );
    case "elephant": {
      const crossedRiver = piece.color === "red" ? to.row <= 4 : to.row >= 5;
      if (crossedRiver) {
        return explanation(
          false,
          "river-boundary",
          "The Elephant cannot cross the river.",
        );
      }
      if (absColumn === 2 && absRow === 2) {
        const eye = {
          column: from.column + columnDelta / 2,
          row: from.row + rowDelta / 2,
        };
        if (getPiece(position, eye)) {
          return explanation(
            false,
            "elephant-eye",
            "The Elephant’s diagonal is blocked at its middle point—the elephant’s eye.",
          );
        }
      }
      return explanation(
        false,
        "piece-pattern",
        "The Elephant moves exactly two intersections diagonally.",
      );
    }
    case "horse": {
      const horsePattern =
        (absColumn === 1 && absRow === 2) || (absColumn === 2 && absRow === 1);
      if (horsePattern) {
        const leg =
          absRow === 2
            ? { column: from.column, row: from.row + Math.sign(rowDelta) }
            : { column: from.column + Math.sign(columnDelta), row: from.row };
        if (getPiece(position, leg)) {
          return explanation(
            false,
            "horse-leg",
            "The Horse is blocked on its first straight step—the horse’s leg.",
          );
        }
      }
      return explanation(
        false,
        "piece-pattern",
        "The Horse moves one intersection straight, then one diagonally outward.",
      );
    }
    case "rook":
      if (columnDelta !== 0 && rowDelta !== 0) {
        return explanation(
          false,
          "piece-pattern",
          "The Rook moves only horizontally or vertically.",
        );
      }
      if (countPiecesBetween(position, from, to) > 0) {
        return explanation(
          false,
          "blocked-path",
          "The Rook cannot move through another piece.",
        );
      }
      break;
    case "cannon": {
      if (columnDelta !== 0 && rowDelta !== 0) {
        return explanation(
          false,
          "piece-pattern",
          "The Cannon moves only horizontally or vertically.",
        );
      }
      const screens = countPiecesBetween(position, from, to);
      if (destination && screens !== 1) {
        return explanation(
          false,
          "cannon-screen",
          `A Cannon capture needs exactly one screen; this line has ${screens}.`,
        );
      }
      if (!destination && screens !== 0) {
        return explanation(
          false,
          "cannon-screen",
          "A Cannon may not jump when it is not capturing.",
        );
      }
      break;
    }
    case "soldier": {
      const forward = piece.color === "red" ? -1 : 1;
      const crossedRiver =
        piece.color === "red" ? from.row <= 4 : from.row >= 5;
      const forwardMove = columnDelta === 0 && rowDelta === forward;
      const sideMove = crossedRiver && absColumn === 1 && rowDelta === 0;
      if (!forwardMove && !sideMove) {
        return explanation(
          false,
          "soldier-direction",
          crossedRiver
            ? "After crossing the river, a Soldier moves one step forward or sideways—never backward."
            : "Before crossing the river, a Soldier moves one step straight forward.",
        );
      }
      break;
    }
  }

  return explanation(
    false,
    "piece-pattern",
    `That destination does not match the ${piece.type}’s movement rule.`,
  );
}

/**
 * Explain move legality without mutating the position. The message is intended
 * for player-facing feedback; the stable code is suitable for UI branching.
 */
export function explainMove(
  position: Position,
  candidate: Move,
): MoveLegalityExplanation {
  if (!isSquareOnBoard(candidate.from) || !isSquareOnBoard(candidate.to)) {
    return explanation(
      false,
      "outside-board",
      "Both intersections must be on the 9×10 board.",
    );
  }
  if (sameSquare(candidate.from, candidate.to)) {
    return explanation(
      false,
      "same-square",
      "Choose a different destination intersection.",
    );
  }
  const piece = getPiece(position, candidate.from);
  if (!piece) {
    return explanation(
      false,
      "empty-source",
      "There is no piece on the starting intersection.",
    );
  }
  if (piece.color !== position.turn) {
    return explanation(
      false,
      "wrong-turn",
      `It is ${position.turn === "red" ? "Red" : "Black"}’s turn.`,
    );
  }
  if (getPiece(position, candidate.to)?.color === piece.color) {
    return explanation(
      false,
      "own-piece",
      "That intersection is occupied by one of your own pieces.",
    );
  }
  if (isLegalMove(position, candidate)) {
    return explanation(true, "legal", "Legal move.");
  }

  const pseudoLegal = generatePseudoLegalMoves(position, candidate.from).some(
    (move) => sameSquare(move.to, candidate.to),
  );
  if (pseudoLegal) {
    return explanation(
      false,
      "self-check",
      "That move would leave your General in check or expose the two Generals to each other.",
    );
  }
  return piecePatternExplanation(position, candidate, piece);
}
