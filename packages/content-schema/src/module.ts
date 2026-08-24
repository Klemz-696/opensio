import { z } from 'zod';
import { SLUG_REGEX } from './track.js';

export const ModuleSchema = z.object({
  slug: z
    .string()
    .min(1, 'Le slug est obligatoire')
    .regex(SLUG_REGEX, 'Le slug doit être en kebab-case (ex: reseaux-fondamentaux)'),
  title: z.string().min(1, 'Le titre est obligatoire'),
  description: z.string().optional().nullable(),
  position: z.number().int().min(0).default(0),
  difficulty: z
    .number()
    .int()
    .min(1, 'La difficulté minimale est 1')
    .max(5, 'La difficulté maximale est 5')
    .default(1),
  estimated_minutes: z.number().int().min(0).default(0),
  competency_refs: z.array(z.string().min(1)).default([]),
  lessons: z.array(z.string().regex(SLUG_REGEX, 'Le slug de leçon doit être en kebab-case')).default([]),
  quizzes: z.array(z.string().regex(SLUG_REGEX, 'Le slug de quiz doit être en kebab-case')).default([]),
  labs: z.array(z.string().regex(SLUG_REGEX, 'Le slug de lab doit être en kebab-case')).default([]),
});

export type ModuleInput = z.input<typeof ModuleSchema>;
export type Module = z.infer<typeof ModuleSchema>;
