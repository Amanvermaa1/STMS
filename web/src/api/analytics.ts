import api from './client';

export type AnalyticsEventType =
  | 'auth.login'
  | 'ticket.view'
  | 'ticket.create_started'
  | 'ticket.create_completed'
  | 'ticket.search'
  | 'ticket.filter_changed'
  | 'ticket.comment_added'
  | 'notification.opened'
  | 'assistant.query'
  | 'settings.updated';

type MetadataValue = string | number | boolean | null;

/** Fire-and-forget analytics. Never pass free-text or personal data here. */
export function track(type: AnalyticsEventType, metadata: Record<string, MetadataValue> = {}): void {
  if (typeof window === 'undefined') return;
  void api
    .post('/analytics/events', { events: [{ type, metadata }] })
    .catch(() => undefined);
}
