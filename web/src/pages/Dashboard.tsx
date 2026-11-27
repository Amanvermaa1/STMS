import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Sparkles, Ticket as TicketIcon } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  CategoryBadge,
  EmptyState,
  ErrorBanner,
  PageHeader,
  PriorityBadge,
  Skeleton,
  SkeletonRows,
  StatusBadge,
  formatDate,
} from '../components/ui';
import type { AnalyticsInsights, Stats, Ticket, UserPreferences } from '../types';

const EMPTY_STATS: Stats = {
  total: 0,
  byStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
  byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
  byCategory: { general: 0, billing: 0, technical: 0, account: 0, feature_request: 0 },
};

const WIDGET_LABELS: Record<string, string> = {
  summary: 'Overview',
  recent: 'Recent tickets',
  priority: 'Priority breakdown',
  insights: 'Product insights',
};

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [recent, setRecent] = useState<Ticket[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const requests: Promise<unknown>[] = [
      api.get<{ stats: Stats }>('/tickets/stats'),
      api.get<{ items: Ticket[] }>('/tickets', { params: { limit: 5, sortBy: 'updatedAt', sortOrder: 'desc' } }),
      api.get<{ preferences: UserPreferences }>('/me/preferences'),
    ];
    if (user?.role === 'admin') {
      requests.push(api.get<{ insights: AnalyticsInsights }>('/analytics/insights'));
    }

    Promise.all(requests)
      .then((responses) => {
        if (!active) return;
        setStats((responses[0] as { data: { stats: Stats } }).data.stats);
        setRecent((responses[1] as { data: { items: Ticket[] } }).data.items);
        setPreferences((responses[2] as { data: { preferences: UserPreferences } }).data.preferences);
        if (responses[3]) {
          setInsights((responses[3] as { data: { insights: AnalyticsInsights } }).data.insights);
        }
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.role]);

  const widgets =
    preferences.dashboard?.widgets?.length
      ? preferences.dashboard.widgets
      : user?.role === 'admin'
        ? ['summary', 'recent', 'priority', 'insights']
        : ['summary', 'recent', 'priority'];

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-xl border border-stone-200 bg-white p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-9 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-8"><SkeletonRows rows={4} /></div>
      </div>
    );
  }

  const cards = [
    { label: 'Total tickets', value: stats.total, icon: TicketIcon, tone: 'bg-brand-50 text-brand-600' },
    { label: 'Open', value: stats.byStatus.open, icon: Clock3, tone: 'bg-orange-50 text-orange-600' },
    { label: 'In progress', value: stats.byStatus.in_progress, icon: TicketIcon, tone: 'bg-warning-50 text-warning-600' },
    { label: 'Resolved', value: stats.byStatus.resolved, icon: CheckCircle2, tone: 'bg-success-50 text-success-600' },
  ];

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle={
          user?.role === 'admin'
            ? 'Here is what is happening across your helpdesk.'
            : 'Track your requests and see the latest updates.'
        }
        action={
          <Link
            to="/tickets/new"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Raise a ticket
          </Link>
        }
      />

      {error && <div className="mb-6"><ErrorBanner message={error} /></div>}

      <div className="space-y-8">
        {widgets.includes('summary') && (
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="sr-only">{WIDGET_LABELS.summary}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="animate-fade-in rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-stone-500">{label}</p>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                      <Icon size={18} />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {widgets.includes('recent') && (
              <section aria-labelledby="recent-heading" className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 id="recent-heading" className="text-base font-semibold text-stone-900">Recent tickets</h2>
                  <Link to="/tickets" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                    View all <ArrowRight size={15} />
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <EmptyState
                    title="No tickets yet"
                    message="When you raise a ticket, you can follow its progress right here."
                    action={
                      <Link to="/tickets/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                        Raise your first ticket
                      </Link>
                    }
                  />
                ) : (
                  <div className="divide-y divide-stone-100">
                    {recent.map((ticket) => (
                      <Link
                        key={ticket.id}
                        to={`/tickets/${ticket.id}`}
                        className="flex flex-wrap items-center gap-3 rounded-lg py-3.5 transition hover:bg-stone-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-stone-800">{ticket.title}</p>
                          <p className="mt-0.5 text-xs text-stone-500">Updated {formatDate(ticket.updatedAt)}</p>
                        </div>
                        <CategoryBadge category={ticket.category} />
                        <PriorityBadge priority={ticket.priority} />
                        <StatusBadge status={ticket.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="space-y-6">
            {widgets.includes('priority') && (
              <section aria-labelledby="priority-heading" className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 id="priority-heading" className="mb-4 text-base font-semibold text-stone-900">Priority breakdown</h2>
                <div className="space-y-4">
                  {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => {
                    const value = stats.byPriority[priority];
                    const percentage = stats.total ? Math.round((value / stats.total) * 100) : 0;
                    return (
                      <div key={priority}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="capitalize text-stone-600">{priority}</span>
                          <span className="font-semibold text-stone-800">{value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className={`h-full rounded-full ${
                              priority === 'urgent'
                                ? 'bg-danger-600'
                                : priority === 'high'
                                  ? 'bg-orange-400'
                                  : priority === 'medium'
                                    ? 'bg-amber-400'
                                    : 'bg-stone-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {widgets.includes('insights') && insights && (
              <section aria-labelledby="insights-heading" className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 id="insights-heading" className="mb-1 flex items-center gap-2 text-base font-semibold text-stone-900">
                  <Sparkles size={17} className="text-brand-600" /> Product insights
                </h2>
                <p className="mb-4 text-xs text-stone-500">Anonymous usage signals from the last {insights.windowDays} days.</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(insights.byType)
                    .filter(([, value]) => value > 0)
                    .slice(0, 4)
                    .map(([type, value]) => (
                      <div key={type} className="rounded-lg bg-stone-50 p-3">
                        <p className="text-xl font-bold text-stone-800">{value}</p>
                        <p className="mt-0.5 truncate text-[11px] text-stone-500">{type.replace('.', ' · ')}</p>
                      </div>
                    ))}
                </div>
                {insights.total === 0 && (
                  <p className="mt-3 text-sm text-stone-500">No usage signals yet. They will appear as people use the app.</p>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs text-stone-400">
        Want a different dashboard? Rearrange your widgets in <Link className="font-medium text-brand-600 hover:underline" to="/settings">Settings</Link>.
      </p>
    </div>
  );
}
