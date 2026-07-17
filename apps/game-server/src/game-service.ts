import { randomUUID } from "node:crypto";
import type {
  ClientCommand,
  GameResult,
  GameSnapshot,
  ServerEvent,
  TerminationReason,
  TimeControlId,
} from "@xiangqi-arena/shared";
import { commitMove, createClock, readClock, stopClock } from "./clock.js";
import {
  requireExpectedVersion,
  requireGameMembership,
  requireRatedEligibility,
} from "./authorization.js";
import type { RatingLedger } from "./elo.js";
import { PublicError } from "./errors.js";
import type { GameRepository } from "./repository.js";
import type {
  MatchCreated,
  PlayerIdentity,
  RulesEngine,
  StoredGame,
  TimeSource,
} from "./types.js";

export const timeControls: Record<
  TimeControlId,
  { initialMs: number; incrementMs: number }
> = {
  "blitz-5": { initialMs: 5 * 60_000, incrementMs: 0 },
  "rapid-10": { initialMs: 10 * 60_000, incrementMs: 0 },
  "classic-15-10": { initialMs: 15 * 60_000, incrementMs: 10_000 },
};

type SubmitMoveCommand = Extract<ClientCommand, { type: "submitMove" }>;
type VersionedCommand = Extract<ClientCommand, { expectedVersion: number }>;

export interface GameMutation {
  event: ServerEvent;
  playerIds: [string, string];
}

export class GameService {
  constructor(
    private readonly games: GameRepository,
    private readonly engine: RulesEngine,
    private readonly ratings: RatingLedger,
    private readonly time: TimeSource,
  ) {}

  async createGame(
    redPlayer: PlayerIdentity,
    blackPlayer: PlayerIdentity,
    timeControlId: TimeControlId,
    rated: boolean,
    roomType: StoredGame["roomType"],
  ): Promise<MatchCreated> {
    if (redPlayer.id === blackPlayer.id) {
      throw new PublicError(
        "SELF_PLAY",
        "A player cannot occupy both sides of a game.",
        409,
      );
    }
    if (rated) {
      requireRatedEligibility(redPlayer);
      requireRatedEligibility(blackPlayer);
    }
    const control = timeControls[timeControlId];
    const initialPosition = this.engine.createInitialSerializedPosition();
    const now = this.time.wallTimeMs();
    const game: StoredGame = {
      id: randomUUID(),
      roomType,
      rated,
      timeControlId,
      redPlayer,
      blackPlayer,
      initialPosition,
      serializedPosition: initialPosition,
      positionHash: this.engine.createHash(initialPosition),
      positionHistory: [initialPosition],
      version: 0,
      moveSequence: 0,
      currentTurn: "red",
      clock: createClock(
        control.initialMs,
        control.incrementMs,
        "red",
        this.time,
      ),
      status: "active",
      result: null,
      terminationReason: null,
      moves: [],
      drawOfferedBy: null,
      rematchRequestedBy: null,
      completionToken: null,
      createdAt: now,
      startedAt: now,
      endedAt: null,
    };
    await this.games.create(game);
    return {
      game,
      colors: { [redPlayer.id]: "red", [blackPlayer.id]: "black" },
    };
  }

  snapshot(game: StoredGame): GameSnapshot {
    return {
      gameId: game.id,
      version: game.version,
      moveSequence: game.moveSequence,
      currentTurn: game.currentTurn,
      serializedPosition: game.serializedPosition,
      clock: readClock(game.clock, this.time).authoritative,
      status: game.status,
      result: game.result,
      terminationReason: game.terminationReason,
    };
  }

  async getSnapshot(gameId: string, playerId: string): Promise<GameSnapshot> {
    return this.games.withGame(gameId, async (game) => {
      requireGameMembership(game, playerId);
      await this.completeTimeoutIfNeeded(game);
      return this.snapshot(game);
    });
  }

  async submitMove(
    playerId: string,
    command: SubmitMoveCommand,
  ): Promise<GameMutation> {
    return this.games.withGame(command.gameId, async (game) => {
      const color = requireGameMembership(game, playerId);
      const playerIds: [string, string] = [
        game.redPlayer.id,
        game.blackPlayer.id,
      ];
      await this.completeTimeoutIfNeeded(game);

      if (game.status !== "active") {
        return {
          event: {
            type: "moveRejected",
            commandId: command.commandId,
            reason: "The game is no longer active.",
            snapshot: this.snapshot(game),
          },
          playerIds,
        };
      }
      if (game.version !== command.expectedVersion) {
        return {
          event: {
            type: "moveRejected",
            commandId: command.commandId,
            reason: "Game state changed. The latest state is attached.",
            snapshot: this.snapshot(game),
          },
          playerIds,
        };
      }
      if (game.currentTurn !== color) {
        return {
          event: {
            type: "moveRejected",
            commandId: command.commandId,
            reason: "It is not your turn.",
            snapshot: this.snapshot(game),
          },
          playerIds,
        };
      }

      const outcome = this.engine.applyMove(
        game.serializedPosition,
        command.move,
        game.positionHistory,
      );
      if (!outcome.accepted) {
        return {
          event: {
            type: "moveRejected",
            commandId: command.commandId,
            reason: outcome.reason,
            snapshot: this.snapshot(game),
          },
          playerIds,
        };
      }

      const clock = commitMove(game.clock, color, this.time);
      if (clock.timedOut !== null) {
        await this.complete(
          game,
          clock.timedOut === "red" ? "black-win" : "red-win",
          "timeout",
        );
        return {
          event: {
            type: "moveRejected",
            commandId: command.commandId,
            reason: "Time expired before the move reached the server.",
            snapshot: this.snapshot(game),
          },
          playerIds,
        };
      }

      game.serializedPosition = outcome.serializedPosition;
      game.positionHash = outcome.positionHash;
      game.positionHistory.push(outcome.serializedPosition);
      game.currentTurn = outcome.currentTurn;
      game.version += 1;
      game.moveSequence += 1;
      game.drawOfferedBy = null;
      game.moves.push({
        id: randomUUID(),
        sequence: game.moveSequence,
        color,
        move: command.move,
        capturedPiece: outcome.capturedPiece,
        positionAfter: outcome.serializedPosition,
        positionHash: outcome.positionHash,
        clock: readClock(game.clock, this.time).authoritative,
        createdAt: this.time.wallTimeMs(),
      });

      if (outcome.terminal) {
        await this.complete(
          game,
          outcome.terminal.result,
          outcome.terminal.reason,
        );
        return {
          event: { type: "gameEnded", snapshot: this.snapshot(game) },
          playerIds,
        };
      }
      return {
        event: {
          type: "moveAccepted",
          commandId: command.commandId,
          snapshot: this.snapshot(game),
        },
        playerIds,
      };
    });
  }

  async resign(
    playerId: string,
    command: VersionedCommand,
  ): Promise<GameMutation> {
    return this.games.withGame(command.gameId, async (game) => {
      const color = requireGameMembership(game, playerId);
      requireExpectedVersion(game, command.expectedVersion);
      if (game.status !== "active")
        throw new PublicError("GAME_ENDED", "The game has ended.", 409);
      await this.complete(
        game,
        color === "red" ? "black-win" : "red-win",
        "resignation",
      );
      return {
        event: { type: "gameEnded", snapshot: this.snapshot(game) },
        playerIds: [game.redPlayer.id, game.blackPlayer.id],
      };
    });
  }

  async offerDraw(
    playerId: string,
    command: VersionedCommand,
  ): Promise<GameMutation> {
    return this.games.withGame(command.gameId, (game) => {
      const color = requireGameMembership(game, playerId);
      requireExpectedVersion(game, command.expectedVersion);
      if (game.status !== "active")
        throw new PublicError("GAME_ENDED", "The game has ended.", 409);
      if (game.drawOfferedBy !== null) {
        throw new PublicError(
          "DRAW_ALREADY_OFFERED",
          "A draw offer is already pending.",
          409,
        );
      }
      game.drawOfferedBy = color;
      return {
        event: { type: "drawOffered", gameId: game.id },
        playerIds: [game.redPlayer.id, game.blackPlayer.id],
      };
    });
  }

  async respondToDraw(
    playerId: string,
    command: VersionedCommand & { accept: boolean },
  ): Promise<GameMutation> {
    return this.games.withGame(command.gameId, async (game) => {
      const color = requireGameMembership(game, playerId);
      requireExpectedVersion(game, command.expectedVersion);
      if (game.status !== "active")
        throw new PublicError("GAME_ENDED", "The game has ended.", 409);
      if (game.drawOfferedBy === null || game.drawOfferedBy === color) {
        throw new PublicError(
          "NO_DRAW_OFFER",
          "There is no opponent draw offer to answer.",
          409,
        );
      }
      game.drawOfferedBy = null;
      const playerIds: [string, string] = [
        game.redPlayer.id,
        game.blackPlayer.id,
      ];
      if (!command.accept) {
        return {
          event: { type: "drawOfferCancelled", gameId: game.id },
          playerIds,
        };
      }
      await this.complete(game, "draw", "draw-agreement");
      return {
        event: { type: "gameEnded", snapshot: this.snapshot(game) },
        playerIds,
      };
    });
  }

  async requestRematch(
    playerId: string,
    command: VersionedCommand,
  ): Promise<GameMutation> {
    return this.games.withGame(command.gameId, (game) => {
      const color = requireGameMembership(game, playerId);
      requireExpectedVersion(game, command.expectedVersion);
      if (game.status !== "completed") {
        throw new PublicError(
          "GAME_ACTIVE",
          "A rematch can be requested after the game ends.",
          409,
        );
      }
      game.rematchRequestedBy = color;
      return {
        event: { type: "rematchRequested", gameId: game.id },
        playerIds: [game.redPlayer.id, game.blackPlayer.id],
      };
    });
  }

  async respondToRematch(
    playerId: string,
    command: VersionedCommand & { accept: boolean },
  ): Promise<{ mutation: GameMutation; rematch: MatchCreated | null }> {
    let players: {
      red: PlayerIdentity;
      black: PlayerIdentity;
      timeControlId: TimeControlId;
      rated: boolean;
    } | null = null;
    const mutation = await this.games.withGame(command.gameId, (game) => {
      const color = requireGameMembership(game, playerId);
      requireExpectedVersion(game, command.expectedVersion);
      if (game.status !== "completed" || game.rematchRequestedBy === null) {
        throw new PublicError(
          "NO_REMATCH_REQUEST",
          "There is no rematch request to answer.",
          409,
        );
      }
      if (game.rematchRequestedBy === color) {
        throw new PublicError(
          "INVALID_REMATCH_RESPONSE",
          "The requester cannot answer the rematch.",
          409,
        );
      }
      const playerIds: [string, string] = [
        game.redPlayer.id,
        game.blackPlayer.id,
      ];
      game.rematchRequestedBy = null;
      if (command.accept) {
        players = {
          red: game.blackPlayer,
          black: game.redPlayer,
          timeControlId: game.timeControlId,
          rated: game.rated,
        };
      }
      return {
        event: command.accept
          ? { type: "rematchRequested", gameId: game.id }
          : { type: "stateSnapshot", snapshot: this.snapshot(game) },
        playerIds,
      } satisfies GameMutation;
    });
    const selected = players as {
      red: PlayerIdentity;
      black: PlayerIdentity;
      timeControlId: TimeControlId;
      rated: boolean;
    } | null;
    const rematch = selected
      ? await this.createGame(
          selected.red,
          selected.black,
          selected.timeControlId,
          selected.rated,
          "rematch",
        )
      : null;
    return { mutation, rematch };
  }

  async players(gameId: string): Promise<[string, string]> {
    const game = await this.games.get(gameId);
    if (!game) throw new PublicError("GAME_NOT_FOUND", "Game not found.", 404);
    return [game.redPlayer.id, game.blackPlayer.id];
  }

  private async completeTimeoutIfNeeded(game: StoredGame): Promise<void> {
    if (game.status !== "active") return;
    const timedOut = readClock(game.clock, this.time).timedOut;
    if (timedOut) {
      await this.complete(
        game,
        timedOut === "red" ? "black-win" : "red-win",
        "timeout",
      );
    }
  }

  private async complete(
    game: StoredGame,
    result: GameResult,
    reason: TerminationReason,
  ): Promise<void> {
    if (game.status === "completed") return;
    stopClock(game.clock, this.time);
    game.status = "completed";
    game.result = result;
    game.terminationReason = reason;
    game.version += 1;
    game.endedAt = this.time.wallTimeMs();
    game.completionToken = randomUUID();
    await this.ratings.complete(game);
  }
}
