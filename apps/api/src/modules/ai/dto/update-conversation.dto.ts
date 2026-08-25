import { z } from 'zod';

export const updateConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Le titre ne peut pas être vide')
    .max(100, 'Le titre ne doit pas dépasser 100 caractères')
    .optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateConversationDto = z.infer<typeof updateConversationSchema>;
