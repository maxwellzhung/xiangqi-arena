import { clientCommandSchema } from "@xiangqi-arena/shared";
import type { ClientCommand, ServerEvent } from "@xiangqi-arena/shared";
import type { SlidingWindowRateLimiter } from "./authorization.js";
import type { EventHub } from "./events.js";
import { PublicError, publicMessage } from "./errors.js";
import type { GameMutation, GameService } from "./game-service.js";
import type { IdempotencyRegistry } from "./idempotency.js";
import type { MatchmakingService } from "./matchmaking-service.js";
import type { PrivateRoomService } from "./room-service.js";
import type { PlayerIdentity } from "./types.js";

interface CommandOutcome {
  direct: ServerEvent[];
  deliveries: Array<{ playerIds: string[]; events: ServerEvent[] }>;
}

function protocolError(error: unknown): ServerEvent {
  return {
    type: "protocolError",
    code: error instanceof PublicError ? error.code : "INTERNAL_ERROR",
    message: publicMessage(error),
  };
}

export class RealtimeGateway {
  constructor(
    private readonly games: GameService,
    private readonly rooms: PrivateRoomService,
    private readonly matchmaking: MatchmakingService,
    private readonly idempotency: IdempotencyRegistry,
    private readonly events: EventHub,
    private readonly rateLimiter: SlidingWindowRateLimiter,
    private readonly roomCreationLimiter: SlidingWindowRateLimiter,
    private readonly matchmakingLimiter: SlidingWindowRateLimiter,
  ) {}

  async handle(
    identity: PlayerIdentity,
    input: unknown,
  ): Promise<ServerEvent[]> {
    const parsed = clientCommandSchema.safeParse(input);
    if (!parsed.success) {
      return [
        {
          type: "protocolError",
          code: "INVALID_COMMAND",
          message: "The command payload is invalid.",
        },
      ];
    }
    const command = parsed.data;
    try {
      this.rateLimiter.consume(identity.id);
      if (command.type === "createPrivateRoom") {
        this.roomCreationLimiter.consume(identity.id);
      }
      if (command.type === "joinMatchmaking") {
        this.matchmakingLimiter.consume(identity.id);
      }
      const result = await this.idempotency.execute(
        identity.id,
        command.commandId,
        command.type,
        async () => {
          try {
            return await this.dispatch(identity, command);
          } catch (error) {
            return {
              direct: [protocolError(error)],
              deliveries: [],
            } satisfies CommandOutcome;
          }
        },
      );

      // A duplicate is delivered again to its sender, but its original
      // opponent broadcast is not repeated.
      this.events.publish(identity.id, result.value.direct);
      if (!result.replayed) {
        for (const delivery of result.value.deliveries) {
          this.events.publishMany(delivery.playerIds, delivery.events);
        }
      }
      return result.value.direct;
    } catch (error) {
      return [protocolError(error)];
    }
  }

  private async dispatch(
    identity: PlayerIdentity,
    command: ClientCommand,
  ): Promise<CommandOutcome> {
    switch (command.type) {
      case "createPrivateRoom": {
        const room = await this.rooms.create(identity, command.timeControlId);
        return {
          direct: [
            {
              type: "roomCreated",
              roomCode: room.roomCode,
              joinUrl: room.joinUrl,
            },
          ],
          deliveries: [],
        };
      }
      case "joinPrivateRoom": {
        const joined = await this.rooms.join(identity, command.roomCode);
        const game = joined.match.game;
        const snapshot: ServerEvent = {
          type: "stateSnapshot",
          snapshot: this.games.snapshot(game),
        };
        return {
          direct: [
            {
              type: "roomJoined",
              gameId: game.id,
              color: joined.match.colors[identity.id]!,
            },
            snapshot,
          ],
          deliveries: [
            {
              playerIds: [joined.owner.id],
              events: [
                {
                  type: "roomJoined",
                  gameId: game.id,
                  color: joined.match.colors[joined.owner.id]!,
                },
                snapshot,
              ],
            },
          ],
        };
      }
      case "joinMatchmaking": {
        const result = await this.matchmaking.join(
          identity,
          command.timeControlId,
          command.rated,
        );
        if (!result.matched) return { direct: [], deliveries: [] };
        const game = result.match.game;
        const snapshot: ServerEvent = {
          type: "stateSnapshot",
          snapshot: this.games.snapshot(game),
        };
        return {
          direct: [
            {
              type: "matchFound",
              gameId: game.id,
              color: result.match.colors[identity.id]!,
            },
            snapshot,
          ],
          deliveries: [
            {
              playerIds: [result.opponent.id],
              events: [
                {
                  type: "matchFound",
                  gameId: game.id,
                  color: result.match.colors[result.opponent.id]!,
                },
                snapshot,
              ],
            },
          ],
        };
      }
      case "leaveMatchmaking":
        this.matchmaking.leave(identity.id);
        return { direct: [], deliveries: [] };
      case "submitMove":
        return this.mutation(
          identity,
          await this.games.submitMove(identity.id, command),
        );
      case "resign":
        return this.mutation(
          identity,
          await this.games.resign(identity.id, command),
        );
      case "offerDraw":
        return this.mutation(
          identity,
          await this.games.offerDraw(identity.id, command),
        );
      case "respondToDraw":
        return this.mutation(
          identity,
          await this.games.respondToDraw(identity.id, command),
        );
      case "requestRematch":
        return this.mutation(
          identity,
          await this.games.requestRematch(identity.id, command),
        );
      case "respondToRematch": {
        const result = await this.games.respondToRematch(identity.id, command);
        if (!result.rematch) return this.mutation(identity, result.mutation);
        const game = result.rematch.game;
        const snapshot: ServerEvent = {
          type: "stateSnapshot",
          snapshot: this.games.snapshot(game),
        };
        const participants = Object.keys(result.rematch.colors);
        return {
          direct: [
            {
              type: "roomJoined",
              gameId: game.id,
              color: result.rematch.colors[identity.id]!,
            },
            snapshot,
          ],
          deliveries: participants
            .filter((playerId) => playerId !== identity.id)
            .map((playerId) => ({
              playerIds: [playerId],
              events: [
                {
                  type: "roomJoined",
                  gameId: game.id,
                  color: result.rematch!.colors[playerId]!,
                },
                snapshot,
              ],
            })),
        };
      }
      case "requestStateSync": {
        const snapshot = await this.games.getSnapshot(
          command.gameId,
          identity.id,
        );
        return {
          direct: [{ type: "stateSnapshot", snapshot }],
          deliveries: [],
        };
      }
      case "heartbeat":
        this.matchmaking.heartbeat(identity.id);
        return { direct: [], deliveries: [] };
    }
  }

  private mutation(
    identity: PlayerIdentity,
    mutation: GameMutation,
  ): CommandOutcome {
    return {
      direct: [mutation.event],
      deliveries: [
        {
          playerIds: mutation.playerIds.filter(
            (playerId) => playerId !== identity.id,
          ),
          events: [mutation.event],
        },
      ],
    };
  }
}
