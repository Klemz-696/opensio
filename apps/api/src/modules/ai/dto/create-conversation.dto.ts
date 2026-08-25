import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  context: z
    .object({
      pageType: z.string().optional(),
      pageSlug: z.string().optional(),
      labSlug: z.string().optional(),
      lessonSlug: z.string().optional(),
      quizSlug: z.string().optional(),
      moduleSlug: z.string().optional(),
    })
    .optional(),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;
