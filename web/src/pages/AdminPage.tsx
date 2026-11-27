import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import {
  CategoryBadge,
  ErrorBanner,
  PageHeader,
  PriorityBadge,
  Skeleton,
  SkeletonRows,
  StatusBadge,
  formatDate,
  inputClass,
  useToast,
} from '../components/ui';
import type { Priority, Stats, Status, Ticket } from '../types';

export function AdminPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | Status>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    const [statsResponse, ticketsResponse] = await Promise.all([
      api.get<{ stats: Stats }>('/admin/stats'),
      api.get<{ items: Ticket[] }>('/admin/tickets', { params }),
    ]);
    setStats(statsResponse.data.stats);
    setTickets(ticketsResponse.data.items);
  }, [statusFilter]);

  useEffect(() => {
    load()
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [load]);

  async function update(ticketId: string, field: 'status' | 'priority', value: string) {
    setError('');
    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, [field]: value } : ticket)),
    );
    try {
      await api.patch(`/admin/tickets/${ticketId}/${field}`, { [field]: value });
      toast(`Ticket ${field} updated.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
      await load().catch(() => undefined);
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-56" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-8"><SkeletonRows rows={5} /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin console" subtitle="Manage every submitted ticket from a single place." />

      <div aria-live="polite">
        {error && <div className="mb-5"><ErrorBanner message={error} /></div>}
      </div>

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total tickets', value: stats.total },
            { label: 'Open', value: stats.byStatus.open },
            { label: 'In progress', value: stats.byStatus.in_progress },
            { label: 'Resolved', value: stats.byStatus.resolved },
          ].map((card) => (
            <div key={card.label} className="animate-fade-in rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-stone-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-stone-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <h2 className="text-base font-semibold text-stone-900">All submissions</h2>
          <div>
            <label htmlFor="admin-status-filter" className="sr-only">Filter by status</label>
            <select
              id="admin-status-filter"
              className={`${inputClass} max-w-xs`}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as '' | Status)}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {tickets.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-stone-500">No tickets match this filter.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Ticket</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Submitted by</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Category</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Priority</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="transition hover:bg-stone-50/70">
                      <td className="px-5 py-4">
                        <Link to={`/tickets/${ticket.id}`} className="font-semibold text-brand-700 hover:underline">
                          {ticket.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-stone-500">#{ticket.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-stone-700">{ticket.authorName ?? '—'}</p>
                        <p className="text-xs text-stone-500">{ticket.author?.email ?? ''}</p>
                      </td>
                      <td className="px-5 py-4"><CategoryBadge category={ticket.category} /></td>
                      <td className="px-5 py-4">
                        <label className="sr-only" htmlFor={`admin-status-${ticket.id}`}>Status for {ticket.title}</label>
                        <select
                          id={`admin-status-${ticket.id}`}
                          className={`${inputClass} py-1.5 text-xs`}
                          value={ticket.status}
                          onChange={(event) => update(ticket.id, 'status', event.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <label className="sr-only" htmlFor={`admin-priority-${ticket.id}`}>Priority for {ticket.title}</label>
                        <select
                          id={`admin-priority-${ticket.id}`}
                          className={`${inputClass} py-1.5 text-xs`}
                          value={ticket.priority}
                          onChange={(event) => update(ticket.id, 'priority', event.target.value as Priority)}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-stone-500">{formatDate(ticket.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-stone-100 md:hidden">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="space-y-3 p-4">
                  <Link to={`/tickets/${ticket.id}`} className="block font-semibold text-brand-700">{ticket.title}</Link>
                  <p className="text-xs text-stone-500">{ticket.authorName ?? '—'} · {formatDate(ticket.updatedAt)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                    <CategoryBadge category={ticket.category} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500" htmlFor={`admin-status-mobile-${ticket.id}`}>Status</label>
                      <select
                        id={`admin-status-mobile-${ticket.id}`}
                        className={inputClass}
                        value={ticket.status}
                        onChange={(event) => update(ticket.id, 'status', event.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500" htmlFor={`admin-priority-mobile-${ticket.id}`}>Priority</label>
                      <select
                        id={`admin-priority-mobile-${ticket.id}`}
                        className={inputClass}
                        value={ticket.priority}
                        onChange={(event) => update(ticket.id, 'priority', event.target.value as Priority)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
