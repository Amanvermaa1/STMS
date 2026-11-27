import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lightbulb, Mic, Square } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { track } from '../api/analytics';
import { useSpeechDictation } from '../hooks/useSpeechDictation';
import { Button, ErrorBanner, Field, PageHeader, Skeleton, inputClass, useToast } from '../components/ui';
import type { Category, Priority, Ticket } from '../types';

const CATEGORY_HINTS: Array<{ category: Category; words: string[] }> = [
  { category: 'billing', words: ['invoice', 'payment', 'charge', 'billing', 'refund', 'subscription'] },
  { category: 'account', words: ['login', 'password', 'account', 'locked', 'access'] },
  { category: 'technical', words: ['error', 'bug', 'crash', 'wifi', 'printer', 'broken', 'not working'] },
  { category: 'feature_request', words: ['feature', 'suggest', 'please add', 'would like', 'request'] },
];

const PRIORITY_HINTS: Array<{ priority: Priority; words: string[] }> = [
  { priority: 'urgent', words: ['urgent', 'asap', 'blocked', 'outage', 'cannot work', 'down'] },
  { priority: 'high', words: ['important', 'today', 'soon', 'deadline'] },
];

function detectSuggestion(text: string): { category?: Category; priority?: Priority } {
  const normalized = text.toLowerCase();
  const category = CATEGORY_HINTS.find((hint) => hint.words.some((word) => normalized.includes(word)))?.category;
  const priority = PRIORITY_HINTS.find((hint) => hint.words.some((word) => normalized.includes(word)))?.priority;
  return { category, priority };
}

export function TicketFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);
  const draftKey = id ? `stms:ticket-draft:${id}` : 'stms:ticket-draft:new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [priority, setPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dictation = useSpeechDictation((text) => setDescription((current) => `${current ? `${current} ` : ''}${text}`));
  const suggestion = useMemo(() => detectSuggestion(`${title} ${description}`), [title, description]);

  useEffect(() => {
    track('ticket.create_started', { editing: isEdit });
    if (!id) {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        try {
          const draft = JSON.parse(raw) as Partial<{ title: string; description: string; category: Category; priority: Priority }>;
          setTitle(draft.title ?? '');
          setDescription(draft.description ?? '');
          setCategory(draft.category ?? 'general');
          setPriority(draft.priority ?? 'medium');
          toast('We restored your unsaved draft.');
        } catch {
          window.localStorage.removeItem(draftKey);
        }
      }
      return undefined;
    }

    let active = true;
    api
      .get<{ ticket: Ticket }>(`/tickets/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setTitle(data.ticket.title);
        setDescription(data.ticket.description);
        setCategory(data.ticket.category);
        setPriority(data.ticket.priority);
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit, draftKey, toast]);

  useEffect(() => {
    if (loading) return undefined;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ title, description, category, priority }));
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [title, description, category, priority, loading, draftKey]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { title, description, category, priority };
      if (isEdit) {
        await api.patch(`/tickets/${id}`, payload);
        toast('Your ticket changes are saved.');
        navigate(`/tickets/${id}`);
      } else {
        const response = await api.post<{ ticket: Ticket }>('/tickets', payload);
        track('ticket.create_completed', { category, priority });
        toast('Ticket submitted. We will take it from here.');
        navigate(`/tickets/${response.data.ticket.id}`);
      }
      window.localStorage.removeItem(draftKey);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <div className="mt-8 space-y-5 rounded-xl border border-stone-200 bg-white p-6">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const showSuggestions =
    !isEdit &&
    ((suggestion.category && suggestion.category !== category) || (suggestion.priority && suggestion.priority !== priority));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit ticket' : 'Raise a support ticket'}
        subtitle={
          isEdit
            ? 'Update the details of your request.'
            : 'Tell us what happened and we will take it from there. Your progress is saved automatically.'
        }
      />
      <form onSubmit={submit} className="animate-slide-up space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        {error && <ErrorBanner message={error} />}

        {showSuggestions && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <Lightbulb size={17} className="shrink-0" />
            <span className="flex-1">A quick guess based on your description:</span>
            {suggestion.category && suggestion.category !== category && (
              <Button
                variant="secondary"
                className="px-2.5 py-1 text-xs"
                onClick={() => setCategory(suggestion.category!)}
              >
                Category: {suggestion.category.replace('_', ' ')}
              </Button>
            )}
            {suggestion.priority && suggestion.priority !== priority && (
              <Button
                variant="secondary"
                className="px-2.5 py-1 text-xs"
                onClick={() => setPriority(suggestion.priority!)}
              >
                Priority: {suggestion.priority}
              </Button>
            )}
          </div>
        )}

        <Field label="Title" htmlFor="title" hint="A short summary helps the support team route your request.">
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
        <Field label="Description" htmlFor="description" hint="What happened, when it started, and what you have already tried.">
          <div className="relative">
            <textarea
              id="description"
              required
              minLength={10}
              maxLength={5000}
              rows={7}
              className={`${inputClass} ${dictation.supported ? 'pb-12' : ''}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the issue in your own words. Dictation is available below."
            />
            {dictation.supported && (
              <button
                type="button"
                onClick={dictation.toggle}
                className={`absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  dictation.listening
                    ? 'bg-danger-600 text-white hover:bg-danger-700'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
                aria-label={dictation.listening ? 'Stop dictation' : 'Dictate description'}
              >
                {dictation.listening ? <Square size={14} /> : <Mic size={15} />}
                {dictation.listening ? 'Stop' : 'Dictate'}
              </button>
            )}
          </div>
          {dictation.error && <p className="mt-1.5 text-xs text-danger-700">{dictation.error}</p>}
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
          <Field label="Priority" htmlFor="priority" hint="Urgent is for issues that block your work right now.">
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
