import { z } from 'zod';

export const updateAiPreferencesSchema = z.object({
  preferredModel: z.string().min(1).max(100).nullable().optional(),
  freeMode: z.boolean().optional(),
});

export type UpdateAiPreferencesDto = z.infer<typeof updateAiPreferencesSchema>;
