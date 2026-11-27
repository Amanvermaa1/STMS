import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Save } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { track } from '../api/analytics';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  CategoryBadge,
  EmptyState,
  ErrorBanner,
  Field,
  PageHeader,
  PriorityBadge,
  SkeletonRows,
  StatusBadge,
  formatDate,
  inputClass,
  useToast,
} from '../components/ui';
import type { Pagination, Priority, Status, Ticket, UserPreferences } from '../types';

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

function readFilters(params: URLSearchParams): Filters {
  const sortBy = params.get('sortBy');
  const sortOrder = params.get('sortOrder');
  return {
    search: params.get('search') ?? '',
    status: (params.get('status') as Filters['status']) ?? '',
    priority: (params.get('priority') as Filters['priority']) ?? '',
    sortBy: (['createdAt', 'updatedAt', 'priority', 'status'] as const).includes(sortBy as Filters['sortBy'])
      ? (sortBy as Filters['sortBy'])
      : 'createdAt',
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, Number(params.get('page')) || 1),
    limit: Math.min(50, Math.max(5, Number(params.get('limit')) || 10)),
  };
}

export function TicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => readFilters(searchParams));
  const hadUrlFilters = useRef(searchParams.toString().length > 0);
  const [items, setItems] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ preferences: UserPreferences }>('/me/preferences')
      .then(({ data }) => {
        if (hadUrlFilters.current || !data.preferences.tickets) return;
        setFilters((current) => ({ ...current, ...data.preferences.tickets, page: 1 }));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    (Object.entries(filters) as Array<[keyof Filters, string | number]>).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) params.set(key, String(value));
    });
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const endpoint = user?.role === 'admin' ? '/admin/tickets' : '/tickets';
    api
      .get<{ items: Ticket[]; pagination: Pagination }>(endpoint, { params: filters })
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
    if (patch.search !== undefined) {
      track('ticket.search', { hasTerm: patch.search.length > 0 });
    } else {
      track('ticket.filter_changed', { field: Object.keys(patch)[0] ?? 'unknown' });
    }
  }

  async function saveView() {
    try {
      await api.patch('/me/preferences', { tickets: filters });
      toast('Your ticket view was saved for next time.');
      track('settings.updated', { area: 'ticket_view' });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const hasFilters = Boolean(filters.search || filters.status || filters.priority);

  return (
    <div>
      <PageHeader
        title={user?.role === 'admin' ? 'All tickets' : 'My tickets'}
        subtitle="Search, filter and track support requests. Your filters stay in the link and can be saved."
        action={
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus size={16} /> New ticket
          </Link>
        }
      />

      <section aria-label="Ticket filters" className="mb-5 grid gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Search" htmlFor="ticket-search" required={false} className="lg:col-span-2">
          <input
            id="ticket-search"
            className={inputClass}
            placeholder="Search by title or description…"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
          />
        </Field>
        <Field label="Status" htmlFor="ticket-status" required={false}>
          <select id="ticket-status" className={inputClass} value={filters.status} onChange={(event) => update({ status: event.target.value as Filters['status'] })}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="Priority" htmlFor="ticket-priority" required={false}>
          <select id="ticket-priority" className={inputClass} value={filters.priority} onChange={(event) => update({ priority: event.target.value as Filters['priority'] })}>
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
        <Field label="Sort by" htmlFor="ticket-sort" required={false}>
          <select
            id="ticket-sort"
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
        </Field>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-5">
          <Button variant="secondary" className="px-3 py-2" onClick={saveView}>
            <Save size={15} /> Save this view
          </Button>
          {hasFilters && (
            <Button variant="ghost" className="px-3 py-2" onClick={() => setFilters({ ...INITIAL_FILTERS })}>
              <RotateCcw size={15} /> Clear filters
            </Button>
          )}
        </div>
      </section>

      {error && <div className="mb-5"><ErrorBanner message={error} /></div>}
      <p className="mb-3 text-sm text-stone-500" aria-live="polite">
        {loading ? 'Loading tickets…' : `${pagination.total} ticket${pagination.total === 1 ? '' : 's'} found`}
      </p>
      {loading ? (
        <SkeletonRows rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No tickets found"
          message="Try a different search or filter. If it is a new issue, raising a ticket is quick."
          action={
            <Button onClick={() => setFilters({ ...INITIAL_FILTERS })} variant="secondary">
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Ticket</th>
                  {user?.role === 'admin' && <th scope="col" className="px-5 py-3 font-semibold">Submitted by</th>}
                  <th scope="col" className="px-5 py-3 font-semibold">Category</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Priority</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((ticket) => (
                  <tr key={ticket.id} className="transition hover:bg-stone-50/70">
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

          <div className="divide-y divide-stone-100 md:hidden">
            {items.map((ticket) => (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="block p-4 transition hover:bg-stone-50">
                <p className="font-semibold text-stone-800">{ticket.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-stone-500">{ticket.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <CategoryBadge category={ticket.category} />
                </div>
                <p className="mt-2 text-[11px] text-stone-400">Updated {formatDate(ticket.updatedAt)}</p>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3 text-sm text-stone-600">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={pagination.page <= 1}
                onClick={() => update({ page: pagination.page - 1 })}
              >
                <ChevronLeft size={15} /> Previous
              </Button>
              <span className="px-2">Page {pagination.page} of {pagination.totalPages}</span>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => update({ page: pagination.page + 1 })}
              >
                Next <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
