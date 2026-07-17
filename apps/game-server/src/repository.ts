import type { PlayerIdentity, StoredGame } from "./types.js";
import { PublicError } from "./errors.js";

export interface GameRepository {
  create(game: StoredGame): Promise<void>;
  get(gameId: string): Promise<StoredGame | null>;
  findActiveByPlayer(playerId: string): Promise<StoredGame | null>;
  withGame<T>(
    gameId: string,
    operation: (draft: StoredGame) => Promise<T> | T,
  ): Promise<T>;
}

function cloneGame(game: StoredGame): StoredGame {
  return structuredClone(game);
}

export class InMemoryGameRepository implements GameRepository {
  private readonly games = new Map<string, StoredGame>();
  private readonly tails = new Map<string, Promise<void>>();

  async create(game: StoredGame): Promise<void> {
    if (this.games.has(game.id))
      throw new PublicError("GAME_EXISTS", "Game already exists.", 409);
    this.games.set(game.id, cloneGame(game));
  }

  async get(gameId: string): Promise<StoredGame | null> {
    const game = this.games.get(gameId);
    return game ? cloneGame(game) : null;
  }

  async findActiveByPlayer(playerId: string): Promise<StoredGame | null> {
    const matches = [...this.games.values()]
      .filter(
        (game) =>
          game.status === "active" &&
          (game.redPlayer.id === playerId || game.blackPlayer.id === playerId),
      )
      .sort((first, second) => second.createdAt - first.createdAt);
    return matches[0] ? cloneGame(matches[0]) : null;
  }

  async withGame<T>(
    gameId: string,
    operation: (draft: StoredGame) => Promise<T> | T,
  ): Promise<T> {
    const previous = this.tails.get(gameId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.tails.set(gameId, tail);
    await previous;

    try {
      const stored = this.games.get(gameId);
      if (!stored)
        throw new PublicError("GAME_NOT_FOUND", "Game not found.", 404);
      const draft = cloneGame(stored);
      const result = await operation(draft);
      this.games.set(gameId, draft);
      return result;
    } finally {
      release();
      if (this.tails.get(gameId) === tail) this.tails.delete(gameId);
    }
  }
}

export interface IdentityRepository {
  save(identity: PlayerIdentity): Promise<void>;
  get(id: string): Promise<PlayerIdentity | null>;
}

export class InMemoryIdentityRepository implements IdentityRepository {
  private readonly identities = new Map<string, PlayerIdentity>();

  async save(identity: PlayerIdentity): Promise<void> {
    this.identities.set(identity.id, { ...identity });
  }

  async get(id: string): Promise<PlayerIdentity | null> {
    const identity = this.identities.get(id);
    return identity ? { ...identity } : null;
  }
}
