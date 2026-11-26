import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  ActivityEntry,
  Button,
  CategoryBadge,
  ErrorBanner,
  Field,
  PriorityBadge,
  Spinner,
  StatusBadge,
  formatDate,
  inputClass,
} from '../components/ui';
import type { ActivityEntry as ActivityItem, Priority, Status, Ticket, TicketComment } from '../types';

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const [ticketResponse, commentsResponse, activityResponse] = await Promise.all([
      api.get<{ ticket: Ticket }>(`/tickets/${id}`),
      api.get<{ comments: TicketComment[] }>(`/tickets/${id}/comments`),
      api.get<{ activity: ActivityItem[] }>(`/tickets/${id}/activity`),
    ]);
    setTicket(ticketResponse.data.ticket);
    setComments(commentsResponse.data.comments);
    setActivity(activityResponse.data.activity);
  }, [id]);

  useEffect(() => {
    load()
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [load]);

  async function updateAdminField(patch: Record<string, string>) {
    if (!ticket) return;
    setBusy(true);
    setError('');
    try {
      const [key, value] = Object.entries(patch)[0]!;
      await api.patch(`/admin/tickets/${ticket.id}/${key}`, { [key]: value });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!ticket || !commentBody.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/tickets/${ticket.id}/comments`, { body: commentBody });
      setCommentBody('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeTicket() {
    if (!ticket || !window.confirm('Delete this ticket? This cannot be undone.')) return;
    try {
      await api.delete(`/tickets/${ticket.id}`);
      navigate('/tickets');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <Spinner />;
  if (!ticket) return <ErrorBanner message={error || 'Ticket not found'} />;

  const isOwner = user?.id === ticket.authorId;
  const canEdit = isOwner && ['open', 'in_progress'].includes(ticket.status);

  return (
    <div>
      <Link to="/tickets" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to tickets
      </Link>

      {error && <div className="mb-5"><ErrorBanner message={error} /></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Ticket #{ticket.id.slice(0, 8)}</p>
                <h1 className="mt-1 text-2xl font-bold text-stone-900">{ticket.title}</h1>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Link
                    to={`/tickets/${ticket.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    <Pencil size={15} /> Edit
                  </Link>
                  <Button variant="danger" onClick={removeTicket} className="px-3 py-2">
                    <Trash2 size={15} /> Delete
                  </Button>
                </div>
              )}
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <CategoryBadge category={ticket.category} />
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{ticket.description}</p>
            <dl className="mt-6 grid gap-4 border-t border-stone-100 pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Submitted by</dt>
                <dd className="mt-1 text-stone-700">{ticket.author?.name ?? ticket.authorName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Created</dt>
                <dd className="mt-1 text-stone-700">{formatDate(ticket.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-stone-900">
              <MessageSquare size={18} /> Conversation ({comments.length})
            </h2>
            <div className="space-y-4">
              {comments.length === 0 && <p className="text-sm text-stone-500">No comments yet. Start the conversation below.</p>}
              {comments.map((comment) => (
                <div key={comment.id} className={`rounded-lg p-4 ${comment.authorRole === 'admin' ? 'bg-brand-50/70 ring-1 ring-brand-100' : 'bg-stone-50'}`}>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-800">
                      {comment.authorName}
                      {comment.authorRole === 'admin' && <span className="ml-2 rounded bg-brand-100 px-2 py-0.5 text-xs text-brand-700">Support team</span>}
                    </p>
                    <p className="text-xs text-stone-500">{formatDate(comment.createdAt)}</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-stone-700">{comment.body}</p>
                </div>
              ))}
            </div>

            <form onSubmit={addComment} className="mt-6 border-t border-stone-100 pt-5">
              <Field label="Add a comment" htmlFor="comment">
                <textarea
                  id="comment"
                  rows={3}
                  required
                  maxLength={2000}
                  className={inputClass}
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Write an update or reply…"
                />
              </Field>
              <div className="mt-3 flex justify-end">
                <Button type="submit" disabled={busy || !commentBody.trim()}>Post comment</Button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-stone-900">Ticket controls</h2>
            {user?.role === 'admin' ? (
              <div className="space-y-4">
                <Field label="Status" htmlFor="status">
                  <select
                    id="status"
                    className={inputClass}
                    value={ticket.status}
                    disabled={busy}
                    onChange={(event) => updateAdminField({ status: event.target.value as Status })}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </Field>
                <Field label="Priority" htmlFor="priority">
                  <select
                    id="priority"
                    className={inputClass}
                    value={ticket.priority}
                    disabled={busy}
                    onChange={(event) => updateAdminField({ priority: event.target.value as Priority })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </Field>
              </div>
            ) : (
              <p className="text-sm text-stone-500">Status changes are managed by the support team.</p>
            )}
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-stone-900">Activity</h2>
            <ActivityEntry activity={activity} />
          </section>
        </div>
      </div>
    </div>
  );
}
