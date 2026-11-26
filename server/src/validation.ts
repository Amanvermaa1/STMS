import { z } from 'zod';

export const categories = ['general', 'billing', 'technical', 'account', 'feature_request'] as const;
export const priorities = ['low', 'medium', 'high', 'urgent'] as const;
export const statuses = ['open', 'in_progress', 'resolved', 'closed'] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  role: z.literal('admin').optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const title = z.string().trim().min(3).max(200);
const description = z.string().trim().min(10).max(5000);

export const createTicketSchema = z.object({
  title,
  description,
  category: z.enum(categories).default('general'),
  priority: z.enum(priorities).default('medium'),
});

export const updateTicketSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    category: z.enum(categories).optional(),
    priority: z.enum(priorities).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const statusSchema = z.object({ status: z.enum(statuses) });
export const prioritySchema = z.object({ priority: z.enum(priorities) });
export const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export const listTicketsSchema = z.object({
  status: z.enum(statuses).optional(),
  priority: z.enum(priorities).optional(),
  category: z.enum(categories).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ListTicketsQuery = z.infer<typeof listTicketsSchema>;
