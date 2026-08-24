import { z } from 'zod';

export const LessonHeartbeatSchema = z.object({
  seconds: z.number().int().positive().max(3600),
});

export type LessonHeartbeatDto = z.infer<typeof LessonHeartbeatSchema>;
