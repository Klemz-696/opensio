import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  context: z
    .object({
      labSlug: z.string().optional(),
      lessonSlug: z.string().optional(),
    })
    .optional(),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;
