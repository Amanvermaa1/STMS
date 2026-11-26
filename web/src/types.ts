export type Role = 'user' | 'admin';
export type Status = 'open' | 'in_progress' | 'resolved' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Category = 'general' | 'billing' | 'technical' | 'account' | 'feature_request';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  authorId: string;
  authorName?: string;
  author?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  eventType: string;
  actorRole: Role;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  ticketId: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Stats {
  total: number;
  byStatus: Record<Status, number>;
  byPriority: Record<Priority, number>;
  byCategory: Record<Category, number>;
}
