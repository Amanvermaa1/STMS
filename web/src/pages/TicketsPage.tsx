import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
  inputClass,
} from '../components/ui';
import type { Pagination, Priority, Status, Ticket } from '../types';

interface Filters {
  search: string;
  status: '' | Status;
  priority: '' | Priority;
  sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

const INITIAL_FILTERS: Filters = {
  search: '',
  status: '',
  priority: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};

export function TicketsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [items, setItems] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) params.set(key, String(value));
    });
    const endpoint = user?.role === 'admin' ? '/admin/tickets' : '/tickets';
    api
      .get<{ items: Ticket[]; pagination: Pagination }>(endpoint, { params })
      .then((response) => {
        if (!active) return;
        setItems(response.data.items);
        setPagination(response.data.pagination);
        setError('');
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, user?.role]);

  function update(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  return (
    <div>
      <PageHeader
        title={user?.role === 'admin' ? 'All tickets' : 'My tickets'}
        subtitle="Search, filter and track support requests."
        action={
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} /> New ticket
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <input
          className={`${inputClass} lg:col-span-2`}
          placeholder="Search by title or description…"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
        />
        <select className={inputClass} value={filters.status} onChange={(event) => update({ status: event.target.value as Filters['status'] })}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select className={inputClass} value={filters.priority} onChange={(event) => update({ priority: event.target.value as Filters['priority'] })}>
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          className={inputClass}
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(':');
            update({ sortBy: sortBy as Filters['sortBy'], sortOrder: sortOrder as Filters['sortOrder'] });
          }}
        >
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="updatedAt:desc">Recently updated</option>
          <option value="priority:desc">Priority: high first</option>
          <option value="priority:asc">Priority: low first</option>
          <option value="status:asc">Status A–Z</option>
        </select>
      </div>

      {error && <div className="mb-5"><ErrorBanner message={error} /></div>}
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="No tickets found" message="Try adjusting your filters or raise a new ticket." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ticket</th>
                  {user?.role === 'admin' && <th className="px-5 py-3 font-semibold">Submitted by</th>}
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Priority</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-stone-50/70">
                    <td className="px-5 py-4">
                      <Link to={`/tickets/${ticket.id}`} className="font-semibold text-brand-700 hover:underline">
                        {ticket.title}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 max-w-md text-xs text-stone-500">{ticket.description}</p>
                    </td>
                    {user?.role === 'admin' && <td className="px-5 py-4 text-stone-600">{ticket.authorName ?? '—'}</td>}
                    <td className="px-5 py-4"><CategoryBadge category={ticket.category} /></td>
                    <td className="px-5 py-4"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-5 py-4"><StatusBadge status={ticket.status} /></td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-stone-500">{formatDate(ticket.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3 text-sm text-stone-600">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-40"
                disabled={pagination.page <= 1}
                onClick={() => update({ page: pagination.page - 1 })}
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-40"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => update({ page: pagination.page + 1 })}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
