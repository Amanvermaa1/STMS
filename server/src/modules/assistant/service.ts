import type { Dependencies } from '../../deps.js';
import type { AuthUser } from '../../middleware/auth.js';
import { categories, priorities, statuses, type ListTicketsQuery } from '../../validation.js';
import { getStats, listTickets } from '../tickets/service.js';

interface AssistantTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  updatedAt: Date;
}

const STOP_WORDS = new Set([
  'a', 'all', 'an', 'and', 'are', 'about', 'any', 'can', 'count', 'find', 'for', 'from', 'how',
  'in', 'is', 'latest', 'list', 'many', 'me', 'my', 'of', 'open', 'please', 'recent', 'recently',
  'search', 'show', 'that', 'the', 'there', 'ticket', 'tickets', 'what', 'with', 'you',
  'status', 'priority', 'category',
]);

function matches(value: string, phrase: string): boolean {
  return value.includes(phrase) || value.includes(phrase.replace(/_/g, ' '));
}

export async function queryAssistant(deps: Dependencies, user: AuthUser, rawQuery: string) {
  const query = rawQuery.toLowerCase().trim();

  const status = statuses.find((value) => matches(query, value));
  const priority = priorities.find((value) => matches(query, value));
  const category = categories.find((value) => matches(query, value));

  const filterPhrases = [status, priority, category].filter(Boolean) as string[];
  const remainder = filterPhrases
    .reduce((text, phrase) => text.replace(new RegExp(phrase.replace(/_/g, '\\s+'), 'g'), ' '), query)
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word))
    .join(' ')
    .trim()
    .slice(0, 100);
  const search = remainder || undefined;
  const isCount = /how many|count|total|how much/.test(query);

  if (isCount) {
    const stats = await getStats(deps, user);
    const answer = status
      ? `You have ${stats.byStatus[status]} ticket${stats.byStatus[status] === 1 ? '' : 's'} with status "${status.replace('_', ' ')}".`
      : priority
        ? `You have ${stats.byPriority[priority]} ticket${stats.byPriority[priority] === 1 ? '' : 's'} marked "${priority}" priority.`
        : category
          ? `You have ${stats.byCategory[category]} ticket${stats.byCategory[category] === 1 ? '' : 's'} in "${category.replace('_', ' ')}".`
          : `You have ${stats.total} ticket${stats.total === 1 ? '' : 's'} in total.`;
    return {
      answer,
      tickets: [] as AssistantTicket[],
      total: stats.total,
      filters: { status: status ?? null, priority: priority ?? null, category: category ?? null, search: search ?? null },
    };
  }

  const listQuery: ListTicketsQuery = {
    status,
    priority,
    category,
    search,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    page: 1,
    limit: 5,
  };
  const { items, pagination } = await listTickets(deps, user, listQuery);
  const answer =
    pagination.total === 0
      ? 'I could not find any tickets matching that. Try a different status, priority, or keyword.'
      : `I found ${pagination.total} matching ticket${pagination.total === 1 ? '' : 's'}. Here ${pagination.total === 1 ? 'is' : 'are'} the most recent:`;

  return {
    answer,
    tickets: items,
    total: pagination.total,
    filters: { status: status ?? null, priority: priority ?? null, category: category ?? null, search: search ?? null },
  };
}
