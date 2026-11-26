import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import {
  CategoryBadge,
  ErrorBanner,
  PageHeader,
  Spinner,
  formatDate,
  inputClass,
} from '../components/ui';
import type { Priority, Stats, Status, Ticket } from '../types';

export function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | Status>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
    try {
      await api.patch(`/admin/tickets/${ticketId}/${field}`, { [field]: value });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Admin console"
        subtitle="Manage every submitted ticket from a single place."
      />

      {error && <div className="mb-5"><ErrorBanner message={error} /></div>}

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total tickets', value: stats.total },
            { label: 'Open', value: stats.byStatus.open },
            { label: 'In progress', value: stats.byStatus.in_progress },
            { label: 'Resolved', value: stats.byStatus.resolved },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">All submissions</h2>
          <select
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Ticket</th>
                <th className="px-5 py-3 font-semibold">Submitted by</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <Link to={`/tickets/${ticket.id}`} className="font-semibold text-indigo-700 hover:underline">
                      {ticket.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">#{ticket.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-700">{ticket.authorName ?? '—'}</p>
                    <p className="text-xs text-slate-500">{ticket.author?.email ?? ''}</p>
                  </td>
                  <td className="px-5 py-4"><CategoryBadge category={ticket.category} /></td>
                  <td className="px-5 py-4">
                    <select
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
                    <select
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
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatDate(ticket.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No tickets match this filter.</p>}
        </div>
      </section>
    </div>
  );
}
