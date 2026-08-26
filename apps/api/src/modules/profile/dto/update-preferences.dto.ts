import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  soundEffects: z.boolean().optional(),
  aiFreeMode: z.boolean().optional(),
  aiPreferredModel: z.string().nullable().optional(),
});

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;
