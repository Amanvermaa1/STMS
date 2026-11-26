import type { DomainEvent, EventType } from './types.js';

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export interface EventBus {
  on(type: EventType, handler: EventHandler): () => void;
  emit(event: DomainEvent): Promise<void>;
  handlerCount(type: EventType): number;
}

/** Small in-process async event bus: handlers are awaited so actions are deterministic. */
export function createEventBus(): EventBus {
  const handlers = new Map<EventType, Set<EventHandler>>();

  return {
    on(type, handler) {
      const set = handlers.get(type) ?? new Set<EventHandler>();
      set.add(handler);
      handlers.set(type, set);
      return () => set.delete(handler);
    },
    async emit(event) {
      const registered = handlers.get(event.type);
      if (!registered?.size) return;
      await Promise.all([...registered].map((handler) => handler(event)));
    },
    handlerCount(type) {
      return handlers.get(type)?.size ?? 0;
    },
  };
}
