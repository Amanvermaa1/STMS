import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Ticket as TicketIcon } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  CategoryBadge,
  EmptyState,
  ErrorBanner,
  PageHeader,
  PriorityBadge,
  Spinner,
  StatusBadge,
  formatDate,
} from '../components/ui';
import type { Stats, Ticket } from '../types';

const EMPTY_STATS: Stats = {
  total: 0,
  byStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
  byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
  byCategory: { general: 0, billing: 0, technical: 0, account: 0, feature_request: 0 },
};

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [recent, setRecent] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ stats: Stats }>('/tickets/stats'),
      api.get<{ items: Ticket[] }>('/tickets', { params: { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' } }),
    ])
      .then(([statsResponse, ticketsResponse]) => {
        setStats(statsResponse.data.stats);
        setRecent(ticketsResponse.data.items);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const cards = [
    { label: 'Total tickets', value: stats.total, icon: TicketIcon, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Open', value: stats.byStatus.open, icon: Clock3, tone: 'bg-blue-50 text-blue-600' },
    { label: 'In progress', value: stats.byStatus.in_progress, icon: TicketIcon, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Resolved', value: stats.byStatus.resolved, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
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
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Raise a ticket
          </Link>
        }
      />

      {error && <div className="mb-6"><ErrorBanner message={error} /></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent tickets</h2>
            <Link to="/tickets" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No tickets yet" message="Create your first ticket to get started." />
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="flex flex-wrap items-center gap-3 py-3.5 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{ticket.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatDate(ticket.updatedAt)}</p>
                  </div>
                  <CategoryBadge category={ticket.category} />
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Priority breakdown</h2>
          <div className="space-y-4">
            {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => {
              const value = stats.byPriority[priority];
              const percentage = stats.total ? Math.round((value / stats.total) * 100) : 0;
              return (
                <div key={priority}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize text-slate-600">{priority}</span>
                    <span className="font-semibold text-slate-800">{value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        priority === 'urgent' ? 'bg-rose-500' : priority === 'high' ? 'bg-orange-400' : priority === 'medium' ? 'bg-sky-400' : 'bg-slate-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
