import type { ServerEvent } from "@xiangqi-arena/shared";

export type EventListener = (event: ServerEvent) => void;

export class EventHub {
  private readonly listeners = new Map<string, Set<EventListener>>();

  subscribe(playerId: string, listener: EventListener): () => void {
    const listeners = this.listeners.get(playerId) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(playerId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(playerId);
    };
  }

  publish(playerId: string, events: readonly ServerEvent[]): void {
    for (const listener of this.listeners.get(playerId) ?? []) {
      for (const event of events) listener(event);
    }
  }

  publishMany(
    playerIds: readonly string[],
    events: readonly ServerEvent[],
  ): void {
    for (const playerId of new Set(playerIds)) this.publish(playerId, events);
  }
}
