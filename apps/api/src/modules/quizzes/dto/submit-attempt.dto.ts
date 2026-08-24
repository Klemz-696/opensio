import { z } from 'zod';

export const SubmitQuizAttemptSchema = z.object({
  answers: z.record(
    z.string().min(1, 'Identifiant de question invalide'),
    z.array(z.string().min(1, 'Identifiant de choix invalide')),
  ).default({}),
});

export type SubmitQuizAttemptDto = z.infer<typeof SubmitQuizAttemptSchema>;
