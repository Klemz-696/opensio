import { z } from 'zod';

export const CompleteLessonSchema = z.object({
  timeSpentSeconds: z.number().int().nonnegative().optional(),
  seconds: z.number().int().nonnegative().optional(),
});

export type CompleteLessonDto = z.infer<typeof CompleteLessonSchema>;
