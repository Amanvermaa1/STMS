import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner, formatDate } from '../components/ui';
import type { AppNotification } from '../types';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    api
      .get<{ notifications: AppNotification[] }>('/notifications')
      .then((response) => setNotifications(response.data.notifications))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, readAt: new Date().toISOString() } : notification,
        ),
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Updates on tickets you are involved in." />
      {error && <div className="mb-5"><ErrorBanner message={error} /></div>}
      {notifications.length === 0 ? (
        <EmptyState title="You are all caught up" message="Notifications will appear here as tickets change." />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex flex-wrap items-center gap-4 rounded-xl border bg-white p-5 shadow-sm ${
                notification.readAt ? 'border-stone-200' : 'border-brand-200 ring-1 ring-brand-100'
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <BellRing size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800">{notification.message}</p>
                <p className="mt-1 text-xs text-stone-500">{formatDate(notification.createdAt)}</p>
              </div>
              {!notification.readAt && (
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => markRead(notification.id)}>
                  Mark read
                </Button>
              )}
              <Link
                to={`/tickets/${notification.ticketId}`}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                View ticket
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
