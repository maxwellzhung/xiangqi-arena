import {
  type Move,
  type NotationStyle,
  type PieceType,
  type Position,
  type Square,
} from "./types";
import { getPiece, isSquareOnBoard } from "./position";

const PIECE_NAMES: Record<PieceType, string> = {
  general: "General",
  advisor: "Advisor",
  elephant: "Elephant",
  horse: "Horse",
  rook: "Rook",
  cannon: "Cannon",
  soldier: "Soldier",
};

function ucciSquare(square: Square): string {
  const file = String.fromCharCode("a".charCodeAt(0) + square.column);
  return `${file}${9 - square.row}`;
}

export function formatMove(
  position: Position,
  move: Move,
  notationStyle: NotationStyle = "ucci",
): string {
  if (!isSquareOnBoard(move.from) || !isSquareOnBoard(move.to))
    throw new RangeError("Move is outside the board");
  const piece = getPiece(position, move.from);
  if (piece === null)
    throw new Error("Cannot format a move from an empty intersection");

  const from = ucciSquare(move.from);
  const to = ucciSquare(move.to);
  if (notationStyle === "ucci") return `${from}${to}`;

  const separator = getPiece(position, move.to) === null ? "-" : "x";
  if (notationStyle === "coordinate") return `${from}${separator}${to}`;
  return `${PIECE_NAMES[piece.type]} ${from}${separator}${to}`;
}
