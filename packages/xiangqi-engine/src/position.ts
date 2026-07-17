import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  BOARD_SIZE,
  COLORS,
  PIECE_TYPES,
  type Color,
  type Piece,
  type PieceType,
  type PlacedPiece,
  type Position,
  type PositionValidationOptions,
  type PositionValidationResult,
  type Square,
} from "./types";

const SYMBOL_BY_PIECE: Record<Color, Record<PieceType, string>> = {
  red: {
    general: "K",
    advisor: "A",
    elephant: "B",
    horse: "N",
    rook: "R",
    cannon: "C",
    soldier: "P",
  },
  black: {
    general: "k",
    advisor: "a",
    elephant: "b",
    horse: "n",
    rook: "r",
    cannon: "c",
    soldier: "p",
  },
};

const PIECE_BY_SYMBOL = new Map<string, Piece>(
  COLORS.flatMap((color) =>
    PIECE_TYPES.map(
      (type) =>
        [SYMBOL_BY_PIECE[color][type], Object.freeze({ color, type })] as const,
    ),
  ),
);

const MAX_PIECES: Record<PieceType, number> = {
  general: 1,
  advisor: 2,
  elephant: 2,
  horse: 2,
  rook: 2,
  cannon: 2,
  soldier: 5,
};

export class InvalidPositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPositionError";
  }
}

export function isSquareOnBoard(square: Square): boolean {
  return (
    Number.isInteger(square.column) &&
    Number.isInteger(square.row) &&
    square.column >= 0 &&
    square.column < BOARD_COLUMNS &&
    square.row >= 0 &&
    square.row < BOARD_ROWS
  );
}

export function squareToIndex(square: Square): number {
  if (!isSquareOnBoard(square)) {
    throw new RangeError(
      `Square (${square.column},${square.row}) is outside the board`,
    );
  }
  return square.row * BOARD_COLUMNS + square.column;
}

export function getPiece(position: Position, square: Square): Piece | null {
  if (!isSquareOnBoard(square)) return null;
  return position.board[square.row * BOARD_COLUMNS + square.column] ?? null;
}

function freezePiece(piece: Piece): Piece {
  return Object.freeze({ color: piece.color, type: piece.type });
}

export function createPositionFromBoard(
  board: readonly (Piece | null)[],
  turn: Color,
): Position {
  if (board.length !== BOARD_SIZE) {
    throw new InvalidPositionError(
      `A Xiangqi board must contain exactly ${BOARD_SIZE} intersections`,
    );
  }
  if (!COLORS.includes(turn))
    throw new InvalidPositionError(`Unknown side to move: ${String(turn)}`);

  const immutableBoard = board.map((piece) =>
    piece === null ? null : freezePiece(piece),
  );
  return Object.freeze({ board: Object.freeze(immutableBoard), turn });
}

export function createPosition(
  pieces: readonly PlacedPiece[],
  turn: Color = "red",
): Position {
  const board: (Piece | null)[] = Array.from(
    { length: BOARD_SIZE },
    () => null,
  );
  for (const placed of pieces) {
    const index = squareToIndex(placed);
    if (board[index] !== null) {
      throw new InvalidPositionError(
        `Two pieces occupy (${placed.column},${placed.row})`,
      );
    }
    if (!COLORS.includes(placed.color) || !PIECE_TYPES.includes(placed.type)) {
      throw new InvalidPositionError(
        `Unknown piece at (${placed.column},${placed.row})`,
      );
    }
    board[index] = { color: placed.color, type: placed.type };
  }
  return createPositionFromBoard(board, turn);
}

export function createInitialPosition(): Position {
  const backRank: readonly PieceType[] = [
    "rook",
    "horse",
    "elephant",
    "advisor",
    "general",
    "advisor",
    "elephant",
    "horse",
    "rook",
  ];
  const pieces: PlacedPiece[] = [];

  for (const color of COLORS) {
    const homeRow = color === "black" ? 0 : 9;
    const cannonRow = color === "black" ? 2 : 7;
    const soldierRow = color === "black" ? 3 : 6;
    backRank.forEach((type, column) =>
      pieces.push({ color, type, column, row: homeRow }),
    );
    pieces.push({ color, type: "cannon", column: 1, row: cannonRow });
    pieces.push({ color, type: "cannon", column: 7, row: cannonRow });
    for (let column = 0; column < BOARD_COLUMNS; column += 2) {
      pieces.push({ color, type: "soldier", column, row: soldierRow });
    }
  }

  return createPosition(pieces, "red");
}

function isInPalace(square: Square, color: Color): boolean {
  if (square.column < 3 || square.column > 5) return false;
  return color === "black"
    ? square.row >= 0 && square.row <= 2
    : square.row >= 7 && square.row <= 9;
}

function findGeneral(position: Position, color: Color): Square | null {
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (piece?.color === color && piece.type === "general") {
      return {
        column: index % BOARD_COLUMNS,
        row: Math.floor(index / BOARD_COLUMNS),
      };
    }
  }
  return null;
}

export function areGeneralsFacing(position: Position): boolean {
  const red = findGeneral(position, "red");
  const black = findGeneral(position, "black");
  if (red === null || black === null || red.column !== black.column)
    return false;

  for (
    let row = Math.min(red.row, black.row) + 1;
    row < Math.max(red.row, black.row);
    row += 1
  ) {
    if (getPiece(position, { column: red.column, row }) !== null) return false;
  }
  return true;
}

export function validatePosition(
  position: Position,
  options: PositionValidationOptions = {},
): PositionValidationResult {
  const errors: string[] = [];
  const requireBothGenerals = options.requireBothGenerals ?? true;

  if (!Array.isArray(position.board) || position.board.length !== BOARD_SIZE) {
    errors.push(`Board must contain exactly ${BOARD_SIZE} intersections`);
  }
  if (!COLORS.includes(position.turn))
    errors.push("Side to move must be red or black");

  const counts = new Map<string, number>();
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (piece === null) continue;
    const square = {
      column: index % BOARD_COLUMNS,
      row: Math.floor(index / BOARD_COLUMNS),
    };
    if (!COLORS.includes(piece.color) || !PIECE_TYPES.includes(piece.type)) {
      errors.push(`Unknown piece at (${square.column},${square.row})`);
      continue;
    }

    const key = `${piece.color}:${piece.type}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if ((counts.get(key) ?? 0) > MAX_PIECES[piece.type]) {
      errors.push(`${piece.color} has too many ${piece.type}s`);
    }
    if (
      (piece.type === "general" || piece.type === "advisor") &&
      !isInPalace(square, piece.color)
    ) {
      errors.push(`${piece.color} ${piece.type} is outside its palace`);
    }
    if (
      piece.type === "elephant" &&
      ((piece.color === "red" && square.row < 5) ||
        (piece.color === "black" && square.row > 4))
    ) {
      errors.push(`${piece.color} elephant has crossed the river`);
    }
  }

  for (const color of COLORS) {
    const generals = counts.get(`${color}:general`) ?? 0;
    if (requireBothGenerals && generals !== 1)
      errors.push(`Position must contain exactly one ${color} general`);
    if (!requireBothGenerals && generals > 1)
      errors.push(`Position cannot contain more than one ${color} general`);
  }
  if (areGeneralsFacing(position))
    errors.push(
      "The generals may not face each other without an intervening piece",
    );

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

export function serializePosition(position: Position): string {
  if (position.board.length !== BOARD_SIZE || !COLORS.includes(position.turn)) {
    throw new InvalidPositionError(
      "Cannot serialize a structurally invalid position",
    );
  }

  const ranks: string[] = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    let rank = "";
    let empty = 0;
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const piece = getPiece(position, { column, row });
      if (piece === null) {
        empty += 1;
      } else {
        if (empty > 0) rank += String(empty);
        empty = 0;
        const symbol = SYMBOL_BY_PIECE[piece.color]?.[piece.type];
        if (!symbol)
          throw new InvalidPositionError(
            `Cannot serialize unknown piece at (${column},${row})`,
          );
        rank += symbol;
      }
    }
    if (empty > 0) rank += String(empty);
    ranks.push(rank);
  }
  return `${ranks.join("/")} ${position.turn === "red" ? "w" : "b"}`;
}

export function deserializePosition(value: string): Position {
  if (typeof value !== "string" || value.trim() !== value) {
    throw new InvalidPositionError(
      "Serialized positions may not contain surrounding whitespace",
    );
  }
  const fields = value.split(" ");
  if (fields.length !== 2 || (fields[1] !== "w" && fields[1] !== "b")) {
    throw new InvalidPositionError(
      "Expected ten ranks followed by active color w or b",
    );
  }
  const ranks = fields[0].split("/");
  if (ranks.length !== BOARD_ROWS)
    throw new InvalidPositionError("Serialized position must have ten ranks");

  const board: (Piece | null)[] = Array.from(
    { length: BOARD_SIZE },
    () => null,
  );
  ranks.forEach((rank, row) => {
    let column = 0;
    for (const symbol of rank) {
      if (/^[1-9]$/.test(symbol)) {
        column += Number(symbol);
      } else {
        const piece = PIECE_BY_SYMBOL.get(symbol);
        if (!piece)
          throw new InvalidPositionError(`Unknown piece symbol: ${symbol}`);
        if (column >= BOARD_COLUMNS)
          throw new InvalidPositionError(
            `Rank ${row} is wider than nine columns`,
          );
        board[row * BOARD_COLUMNS + column] = piece;
        column += 1;
      }
    }
    if (column !== BOARD_COLUMNS)
      throw new InvalidPositionError(
        `Rank ${row} does not contain nine columns`,
      );
  });

  return createPositionFromBoard(board, fields[1] === "w" ? "red" : "black");
}

const SHA_256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/** A small synchronous SHA-256 implementation keeps the engine runtime-neutral. */
export function hashString(value: string): string {
  const input = new TextEncoder().encode(value);
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const state = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1)
      words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rotateRight(words[index - 15], 7) ^
        rotateRight(words[index - 15], 18) ^
        (words[index - 15] >>> 3);
      const s1 =
        rotateRight(words[index - 2], 17) ^
        rotateRight(words[index - 2], 19) ^
        (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const sigma1 =
        rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 =
        (h + sigma1 + choice + SHA_256_CONSTANTS[index] + words[index]) >>> 0;
      const sigma0 =
        rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  return state.map((word) => word.toString(16).padStart(8, "0")).join("");
}

export function createPositionHash(position: Position): string {
  return hashString(serializePosition(position));
}
