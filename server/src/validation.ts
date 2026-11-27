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

const dashboardWidgets = ['summary', 'recent', 'priority', 'activity', 'insights'] as const;

export const preferencesSchema = z
  .object({
    dashboard: z
      .object({ widgets: z.array(z.enum(dashboardWidgets)).max(dashboardWidgets.length).optional() })
      .strict()
      .optional(),
    tickets: z
      .object({
        search: z.string().trim().max(100).optional(),
        status: z.enum(statuses).optional(),
        priority: z.enum(priorities).optional(),
        sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        limit: z.number().int().min(5).max(50).optional(),
      })
      .strict()
      .optional(),
    privacy: z
      .object({
        analyticsOptIn: z.boolean().optional(),
        productUpdatesOptIn: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one preference is required' });

export const analyticsEventTypes = [
  'auth.login',
  'ticket.view',
  'ticket.create_started',
  'ticket.create_completed',
  'ticket.search',
  'ticket.filter_changed',
  'ticket.comment_added',
  'notification.opened',
  'assistant.query',
  'settings.updated',
] as const;

const analyticsMetadataValue = z.union([z.string().max(120), z.number(), z.boolean(), z.null()]);

export const analyticsEventSchema = z
  .object({
    type: z.enum(analyticsEventTypes),
    metadata: z.record(z.string().max(80), analyticsMetadataValue).default({}),
  })
  .strict();

export const analyticsBatchSchema = z
  .object({ events: z.array(analyticsEventSchema).min(1).max(25) })
  .strict();

export const assistantQuerySchema = z
  .object({ query: z.string().trim().min(1).max(200) })
  .strict();

export const confirmPasswordSchema = z
  .object({ password: z.string().min(1).max(128) })
  .strict();

export const passkeyEmailSchema = z
  .object({ email: z.string().trim().toLowerCase().email().max(254).optional() })
  .strict();

export const registrationResponseSchema = z
  .object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    type: z.literal('public-key'),
    response: z
      .object({
        clientDataJSON: z.string().min(1),
        attestationObject: z.string().min(1),
        transports: z.array(z.string().max(30)).optional(),
      })
      .passthrough(),
    clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const authenticationResponseSchema = z
  .object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    type: z.literal('public-key'),
    response: z
      .object({
        clientDataJSON: z.string().min(1),
        authenticatorData: z.string().min(1),
        signature: z.string().min(1),
        userHandle: z.string().nullable().optional(),
      })
      .passthrough(),
    clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const passkeyAuthenticationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    response: authenticationResponseSchema,
  })
  .strict();
