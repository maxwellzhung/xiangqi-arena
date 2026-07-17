import { randomInt } from "node:crypto";
import type { TimeControlId } from "@xiangqi-arena/shared";
import { PublicError } from "./errors.js";
import type { GameService } from "./game-service.js";
import type { MatchCreated, PlayerIdentity } from "./types.js";

const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface PrivateRoom {
  code: string;
  owner: PlayerIdentity;
  timeControlId: TimeControlId;
  status: "waiting" | "joining" | "joined" | "expired";
  createdAt: number;
  expiresAt: number;
  gameId: string | null;
}

export interface RoomCreated {
  roomCode: string;
  joinUrl: string;
}

export interface RoomJoined {
  match: MatchCreated;
  owner: PlayerIdentity;
  joiner: PlayerIdentity;
}

export class PrivateRoomService {
  private readonly rooms = new Map<string, PrivateRoom>();

  constructor(
    private readonly games: GameService,
    private readonly publicOrigin: string,
    private readonly ttlMs = 30 * 60_000,
    private readonly now = () => Date.now(),
  ) {}

  async create(
    owner: PlayerIdentity,
    timeControlId: TimeControlId,
  ): Promise<RoomCreated> {
    this.expireRooms();
    let code = "";
    do {
      code = Array.from(
        { length: 6 },
        () => roomAlphabet[randomInt(0, roomAlphabet.length)],
      ).join("");
    } while (this.rooms.has(code));
    const createdAt = this.now();
    this.rooms.set(code, {
      code,
      owner,
      timeControlId,
      status: "waiting",
      createdAt,
      expiresAt: createdAt + this.ttlMs,
      gameId: null,
    });
    return {
      roomCode: code,
      joinUrl: new URL(`/play/private/${code}`, this.publicOrigin).toString(),
    };
  }

  async join(joiner: PlayerIdentity, roomCode: string): Promise<RoomJoined> {
    this.expireRooms();
    const room = this.rooms.get(roomCode);
    if (!room || room.status === "expired") {
      throw new PublicError(
        "ROOM_NOT_FOUND",
        "That private room was not found or has expired.",
        404,
      );
    }
    if (room.owner.id === joiner.id) {
      throw new PublicError(
        "ROOM_OWNER_JOIN",
        "Share this code with another player.",
        409,
      );
    }
    if (room.status !== "waiting") {
      throw new PublicError(
        "ROOM_UNAVAILABLE",
        "That private room is no longer available.",
        409,
      );
    }
    room.status = "joining";
    try {
      const match = await this.games.createGame(
        room.owner,
        joiner,
        room.timeControlId,
        false,
        "private",
      );
      room.status = "joined";
      room.gameId = match.game.id;
      return { match, owner: room.owner, joiner };
    } catch (error) {
      room.status = "waiting";
      throw error;
    }
  }

  expireRooms(): number {
    const now = this.now();
    let expired = 0;
    for (const room of this.rooms.values()) {
      if (room.status === "waiting" && room.expiresAt <= now) {
        room.status = "expired";
        expired += 1;
      }
    }
    return expired;
  }
}
