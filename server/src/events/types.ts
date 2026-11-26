export type EventType =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.status_changed'
  | 'ticket.resolved'
  | 'comment.added';

export interface DomainEvent {
  type: EventType;
  ticketId: string;
  actorId: string;
  actorRole: 'user' | 'admin';
  title: string;
  at: Date;
  metadata?: Record<string, unknown>;
  notify?: { userIds?: string[]; role?: 'admin' };
}
