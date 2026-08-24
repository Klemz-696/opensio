import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Le message ne peut pas être vide').max(4000, 'Le message ne doit pas dépasser 4000 caractères'),
  context: z
    .object({
      labSlug: z.string().optional(),
      lessonSlug: z.string().optional(),
    })
    .optional(),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
