import type { Dependencies } from '../deps.js';
import { logActivity } from '../services/activity.js';
import { createNotifications } from '../services/notifications.js';
import type { EventType } from './types.js';

const ALL_EVENTS: EventType[] = [
  'ticket.created',
  'ticket.updated',
  'ticket.status_changed',
  'ticket.resolved',
  'comment.added',
];

/**
 * Event actions: every domain event writes an activity log, creates in-app
 * notifications, and optionally sends an email when SMTP is configured.
 */
export function registerEventHandlers({ db, eventBus, mailer }: Dependencies): () => void {
  const unsubscribers = ALL_EVENTS.map((type) =>
    eventBus.on(type, async (event) => {
      await logActivity(db, event);

      const recipients = await createNotifications(db, event);
      if (mailer.configured && recipients.length > 0) {
        await mailer.send({
          to: recipients.map((recipient) => recipient.email),
          subject: `[Helpdesk] ${recipients[0]?.message ?? event.type}`,
          text: recipients[0]?.message ?? event.type,
        });
      }
    }),
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
