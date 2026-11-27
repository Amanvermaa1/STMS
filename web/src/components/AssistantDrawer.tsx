import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Send, Sparkles, Square, X } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { track } from '../api/analytics';
import { useSpeechDictation } from '../hooks/useSpeechDictation';
import type { AssistantResult } from '../types';
import { Button, PriorityBadge, StatusBadge, formatDate } from './ui';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  result?: AssistantResult;
  error?: boolean;
}

const SUGGESTIONS = [
  'Show my open tickets',
  'How many urgent tickets do I have?',
  'Find tickets about billing',
];

export function AssistantDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      text: 'Hi! I can help you find tickets. Try asking about a status, priority, category, or keyword.',
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dictation = useSpeechDictation((text) => setQuery((current) => `${current ? `${current} ` : ''}${text}`));

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    setQuery('');
    setBusy(true);
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: trimmed }]);
    try {
      const { data } = await api.post<AssistantResult>('/assistant/query', { query: trimmed });
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', text: data.answer, result: data },
      ]);
      track('assistant.query', { resultCount: data.total });
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', text: errorMessage(error), error: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(query);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/40 animate-fade-in" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ticket assistant"
        className="flex h-full w-full max-w-md animate-slide-up flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles size={18} />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-stone-900">Ticket assistant</h2>
            <p className="text-xs text-stone-500">Answers come only from your own tickets.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close assistant" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100">
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-stone-50 px-5 py-5" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  message.role === 'user'
                    ? 'rounded-br-sm bg-brand-600 text-white'
                    : message.error
                      ? 'rounded-bl-sm border border-danger-200 bg-danger-50 text-danger-700'
                      : 'rounded-bl-sm border border-stone-200 bg-white text-stone-700'
                }`}
              >
                <p className="leading-relaxed">{message.text}</p>
                {message.result && message.result.tickets.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
                    {message.result.tickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        to={`/tickets/${ticket.id}`}
                        onClick={onClose}
                        className="block rounded-lg p-2.5 transition hover:bg-stone-50"
                      >
                        <p className="truncate text-xs font-semibold text-brand-700">{ticket.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={ticket.status} />
                          <PriorityBadge priority={ticket.priority} />
                          <span className="text-[11px] text-stone-400">{formatDate(ticket.updatedAt)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <p className="text-center text-xs text-stone-500">Looking through your tickets…</p>}
          <div ref={endRef} />
        </div>

        <div className="border-t border-stone-200 bg-white px-5 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={busy}
                onClick={() => void ask(suggestion)}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={200}
              placeholder="Ask about your tickets…"
              aria-label="Ask the ticket assistant"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {dictation.supported && (
              <button
                type="button"
                onClick={dictation.toggle}
                aria-label={dictation.listening ? 'Stop dictation' : 'Dictate question'}
                title={dictation.listening ? 'Stop dictation' : 'Dictate question'}
                className={`rounded-lg p-2.5 transition ${dictation.listening ? 'bg-danger-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                {dictation.listening ? <Square size={17} /> : <Mic size={18} />}
              </button>
            )}
            <Button type="submit" disabled={busy || !query.trim()} className="px-3 py-2.5" aria-label="Send question">
              <Send size={17} />
            </Button>
          </form>
          {dictation.error && <p className="mt-2 text-xs text-danger-700">{dictation.error}</p>}
        </div>
      </aside>
    </div>
  );
}
