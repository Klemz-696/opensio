import { z } from 'zod';

export const listConversationsQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'all']).default('active').optional(),
});

export type ListConversationsQueryDto = z.infer<typeof listConversationsQuerySchema>;
