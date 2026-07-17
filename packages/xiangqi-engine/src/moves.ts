import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  type Color,
  type Move,
  type Piece,
  type Position,
  type Square,
} from "./types";
import {
  createPositionFromBoard,
  getPiece,
  isSquareOnBoard,
  squareToIndex,
} from "./position";

const ORTHOGONAL_DIRECTIONS = [
  { column: 0, row: -1 },
  { column: 1, row: 0 },
  { column: 0, row: 1 },
  { column: -1, row: 0 },
] as const;

const HORSE_MOVES = [
  { column: -1, row: -2, legColumn: 0, legRow: -1 },
  { column: 1, row: -2, legColumn: 0, legRow: -1 },
  { column: 2, row: -1, legColumn: 1, legRow: 0 },
  { column: 2, row: 1, legColumn: 1, legRow: 0 },
  { column: 1, row: 2, legColumn: 0, legRow: 1 },
  { column: -1, row: 2, legColumn: 0, legRow: 1 },
  { column: -2, row: 1, legColumn: -1, legRow: 0 },
  { column: -2, row: -1, legColumn: -1, legRow: 0 },
] as const;

export class IllegalMoveError extends Error {
  readonly move: Move;

  constructor(move: Move, message = "Move is not legal in this position") {
    super(message);
    this.name = "IllegalMoveError";
    this.move = move;
  }
}

export function oppositeColor(color: Color): Color {
  return color === "red" ? "black" : "red";
}

function square(column: number, row: number): Square {
  return Object.freeze({ column, row });
}

function move(from: Square, to: Square): Move {
  return Object.freeze({
    from: square(from.column, from.row),
    to: square(to.column, to.row),
  });
}

function isInPalace(target: Square, color: Color): boolean {
  if (target.column < 3 || target.column > 5) return false;
  return color === "red"
    ? target.row >= 7 && target.row <= 9
    : target.row >= 0 && target.row <= 2;
}

function mayLandOn(position: Position, target: Square, piece: Piece): boolean {
  if (!isSquareOnBoard(target)) return false;
  return getPiece(position, target)?.color !== piece.color;
}

function addIfAvailable(
  moves: Move[],
  position: Position,
  from: Square,
  target: Square,
  piece: Piece,
): void {
  if (mayLandOn(position, target, piece)) moves.push(move(from, target));
}

function generateGeneralMoves(
  position: Position,
  from: Square,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];
  for (const direction of ORTHOGONAL_DIRECTIONS) {
    const target = square(
      from.column + direction.column,
      from.row + direction.row,
    );
    if (isInPalace(target, piece.color))
      addIfAvailable(moves, position, from, target, piece);
  }

  // A general may capture the opposing general along an otherwise empty file.
  for (const rowStep of [-1, 1] as const) {
    for (
      let row = from.row + rowStep;
      row >= 0 && row < BOARD_ROWS;
      row += rowStep
    ) {
      const target = square(from.column, row);
      const occupant = getPiece(position, target);
      if (occupant === null) continue;
      if (occupant.color !== piece.color && occupant.type === "general")
        moves.push(move(from, target));
      break;
    }
  }
  return moves;
}

function generateAdvisorMoves(
  position: Position,
  from: Square,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];
  for (const columnStep of [-1, 1] as const) {
    for (const rowStep of [-1, 1] as const) {
      const target = square(from.column + columnStep, from.row + rowStep);
      if (isInPalace(target, piece.color))
        addIfAvailable(moves, position, from, target, piece);
    }
  }
  return moves;
}

function generateElephantMoves(
  position: Position,
  from: Square,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];
  for (const columnStep of [-2, 2] as const) {
    for (const rowStep of [-2, 2] as const) {
      const target = square(from.column + columnStep, from.row + rowStep);
      const staysHome =
        piece.color === "red" ? target.row >= 5 : target.row <= 4;
      const eye = square(from.column + columnStep / 2, from.row + rowStep / 2);
      if (staysHome && getPiece(position, eye) === null)
        addIfAvailable(moves, position, from, target, piece);
    }
  }
  return moves;
}

function generateHorseMoves(
  position: Position,
  from: Square,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];
  for (const candidate of HORSE_MOVES) {
    const leg = square(
      from.column + candidate.legColumn,
      from.row + candidate.legRow,
    );
    if (getPiece(position, leg) !== null) continue;
    const target = square(
      from.column + candidate.column,
      from.row + candidate.row,
    );
    addIfAvailable(moves, position, from, target, piece);
  }
  return moves;
}

function generateRookMoves(
  position: Position,
  from: Square,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];
  for (const direction of ORTHOGONAL_DIRECTIONS) {
    for (
      let column = from.column + direction.column,
        row = from.row + direction.row;
      column >= 0 && column < BOARD_COLUMNS && row >= 0 && row < BOARD_ROWS;
      column += direction.column, row += direction.row
    ) {
      const target = square(column, row);
      const occupant = getPiece(position, target);
      if (occupant === null) {
        moves.push(move(from, target));
        continue;
      }
      if (occupant.color !== piece.color) moves.push(move(from, target));
      break;
    }
  }
  return moves;
}

function generateCannonMoves(
  position: Position,
  from: Square,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];
  for (const direction of ORTHOGONAL_DIRECTIONS) {
    let foundScreen = false;
    for (
      let column = from.column + direction.column,
        row = from.row + direction.row;
      column >= 0 && column < BOARD_COLUMNS && row >= 0 && row < BOARD_ROWS;
      column += direction.column, row += direction.row
    ) {
      const target = square(column, row);
      const occupant = getPiece(position, target);
      if (!foundScreen) {
        if (occupant === null) moves.push(move(from, target));
        else foundScreen = true;
        continue;
      }
      if (occupant === null) continue;
      if (occupant.color !== piece.color) moves.push(move(from, target));
      break;
    }
  }
  return moves;
}

function generateSoldierMoves(
  position: Position,
  from: Square,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];
  const forward = piece.color === "red" ? -1 : 1;
  addIfAvailable(
    moves,
    position,
    from,
    square(from.column, from.row + forward),
    piece,
  );

  const crossedRiver = piece.color === "red" ? from.row <= 4 : from.row >= 5;
  if (crossedRiver) {
    addIfAvailable(
      moves,
      position,
      from,
      square(from.column - 1, from.row),
      piece,
    );
    addIfAvailable(
      moves,
      position,
      from,
      square(from.column + 1, from.row),
      piece,
    );
  }
  return moves;
}

export function generatePseudoLegalMoves(
  position: Position,
  from: Square,
): readonly Move[] {
  if (!isSquareOnBoard(from)) return Object.freeze([]);
  const piece = getPiece(position, from);
  if (piece === null) return Object.freeze([]);

  let moves: Move[];
  switch (piece.type) {
    case "general":
      moves = generateGeneralMoves(position, from, piece);
      break;
    case "advisor":
      moves = generateAdvisorMoves(position, from, piece);
      break;
    case "elephant":
      moves = generateElephantMoves(position, from, piece);
      break;
    case "horse":
      moves = generateHorseMoves(position, from, piece);
      break;
    case "rook":
      moves = generateRookMoves(position, from, piece);
      break;
    case "cannon":
      moves = generateCannonMoves(position, from, piece);
      break;
    case "soldier":
      moves = generateSoldierMoves(position, from, piece);
      break;
  }
  return Object.freeze(moves);
}

export function findGeneral(position: Position, color: Color): Square | null {
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (piece?.color === color && piece.type === "general") {
      return square(index % BOARD_COLUMNS, Math.floor(index / BOARD_COLUMNS));
    }
  }
  return null;
}

export function isSquareAttacked(
  position: Position,
  target: Square,
  attacker: Color,
): boolean {
  if (!isSquareOnBoard(target)) return false;
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (piece?.color !== attacker) continue;
    const from = square(
      index % BOARD_COLUMNS,
      Math.floor(index / BOARD_COLUMNS),
    );
    if (
      generatePseudoLegalMoves(position, from).some(
        (candidate) =>
          candidate.to.column === target.column &&
          candidate.to.row === target.row,
      )
    ) {
      return true;
    }
  }
  return false;
}

export function isInCheck(position: Position, color: Color): boolean {
  const general = findGeneral(position, color);
  return (
    general === null ||
    isSquareAttacked(position, general, oppositeColor(color))
  );
}

function applyUnchecked(position: Position, candidate: Move): Position {
  const board = [...position.board];
  const fromIndex = squareToIndex(candidate.from);
  const toIndex = squareToIndex(candidate.to);
  board[toIndex] = board[fromIndex];
  board[fromIndex] = null;
  return createPositionFromBoard(board, oppositeColor(position.turn));
}

function sameMove(left: Move, right: Move): boolean {
  return (
    left.from.column === right.from.column &&
    left.from.row === right.from.row &&
    left.to.column === right.to.column &&
    left.to.row === right.to.row
  );
}

export function generateLegalMoves(
  position: Position,
  from?: Square,
): readonly Move[] {
  if (findGeneral(position, position.turn) === null) return Object.freeze([]);

  const sourceSquares: Square[] = [];
  if (from !== undefined) {
    if (
      !isSquareOnBoard(from) ||
      getPiece(position, from)?.color !== position.turn
    )
      return Object.freeze([]);
    sourceSquares.push(square(from.column, from.row));
  } else {
    for (let index = 0; index < position.board.length; index += 1) {
      if (position.board[index]?.color === position.turn) {
        sourceSquares.push(
          square(index % BOARD_COLUMNS, Math.floor(index / BOARD_COLUMNS)),
        );
      }
    }
  }

  const legal: Move[] = [];
  for (const source of sourceSquares) {
    for (const candidate of generatePseudoLegalMoves(position, source)) {
      const next = applyUnchecked(position, candidate);
      if (!isInCheck(next, position.turn)) legal.push(candidate);
    }
  }
  return Object.freeze(legal);
}

export function isLegalMove(position: Position, candidate: Move): boolean {
  if (!isSquareOnBoard(candidate.from) || !isSquareOnBoard(candidate.to))
    return false;
  return generateLegalMoves(position, candidate.from).some((legal) =>
    sameMove(legal, candidate),
  );
}

export function applyMove(position: Position, candidate: Move): Position {
  if (!isLegalMove(position, candidate)) throw new IllegalMoveError(candidate);
  return applyUnchecked(position, candidate);
}

export function tryApplyMove(
  position: Position,
  candidate: Move,
):
  | { readonly ok: true; readonly position: Position }
  | { readonly ok: false; readonly error: IllegalMoveError } {
  try {
    return Object.freeze({
      ok: true as const,
      position: applyMove(position, candidate),
    });
  } catch (error) {
    if (error instanceof IllegalMoveError)
      return Object.freeze({ ok: false as const, error });
    throw error;
  }
}
