import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { Button, ErrorBanner, Field, PageHeader, Spinner, inputClass } from '../components/ui';
import type { Category, Priority, Ticket } from '../types';

export function TicketFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [priority, setPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .get<{ ticket: Ticket }>(`/tickets/${id}`)
      .then(({ data }) => {
        setTitle(data.ticket.title);
        setDescription(data.ticket.description);
        setCategory(data.ticket.category);
        setPriority(data.ticket.priority);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { title, description, category, priority };
      if (isEdit) {
        await api.patch(`/tickets/${id}`, payload);
        navigate(`/tickets/${id}`);
      } else {
        const response = await api.post<{ ticket: Ticket }>('/tickets', payload);
        navigate(`/tickets/${response.data.ticket.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit ticket' : 'Raise a support ticket'}
        subtitle={isEdit ? 'Update the details of your request.' : 'Tell us what happened and we will take it from there.'}
      />
      <form onSubmit={submit} className="space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        {error && <ErrorBanner message={error} />}
        <Field label="Title" htmlFor="title">
          <input
            id="title"
            required
            minLength={3}
            maxLength={200}
            className={inputClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Laptop will not connect to Wi-Fi"
          />
        </Field>
        <Field label="Description" htmlFor="description">
          <textarea
            id="description"
            required
            minLength={10}
            maxLength={5000}
            rows={7}
            className={inputClass}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue, when it started, and what you have tried so far."
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" htmlFor="category">
            <select id="category" className={inputClass} value={category} onChange={(event) => setCategory(event.target.value as Category)}>
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="account">Account</option>
              <option value="feature_request">Feature request</option>
            </select>
          </Field>
          <Field label="Priority" htmlFor="priority">
            <select id="priority" className={inputClass} value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-5">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Submit ticket'}
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
