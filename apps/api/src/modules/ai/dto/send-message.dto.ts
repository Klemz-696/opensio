import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Le message ne peut pas être vide').max(4000, 'Le message ne doit pas dépasser 4000 caractères'),
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

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
