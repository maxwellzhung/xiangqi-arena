import { PublicError } from "./errors.js";

interface Entry<T> {
  actorId: string;
  commandType: string;
  createdAt: number;
  value: Promise<T>;
}

export interface IdempotentResult<T> {
  value: T;
  replayed: boolean;
}

/**
 * Coalesces concurrent duplicates and retains the completed response. A durable
 * adapter implements the same unique-command-id contract in the database.
 */
export class IdempotencyRegistry {
  private readonly entries = new Map<string, Entry<unknown>>();

  constructor(
    private readonly retentionMs = 24 * 60 * 60 * 1_000,
    private readonly now = () => Date.now(),
  ) {}

  async execute<T>(
    actorId: string,
    commandId: string,
    commandType: string,
    operation: () => Promise<T>,
  ): Promise<IdempotentResult<T>> {
    const existing = this.entries.get(commandId) as Entry<T> | undefined;
    if (existing) {
      if (
        existing.actorId !== actorId ||
        existing.commandType !== commandType
      ) {
        throw new PublicError(
          "COMMAND_ID_REUSE",
          "That command identifier was already used for another request.",
          409,
        );
      }
      return { value: await existing.value, replayed: true };
    }

    const value = operation();
    this.entries.set(commandId, {
      actorId,
      commandType,
      createdAt: this.now(),
      value,
    });

    try {
      return { value: await value, replayed: false };
    } catch (error) {
      // Retriable failures are not memoized. Successfully produced rejection
      // events are values and remain memoized.
      this.entries.delete(commandId);
      throw error;
    }
  }

  prune(): number {
    const cutoff = this.now() - this.retentionMs;
    let removed = 0;
    for (const [commandId, entry] of this.entries) {
      if (entry.createdAt < cutoff) {
        this.entries.delete(commandId);
        removed += 1;
      }
    }
    return removed;
  }
}
