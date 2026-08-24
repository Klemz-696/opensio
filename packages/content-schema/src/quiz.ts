import { z } from 'zod';
import { SLUG_REGEX } from './track.js';

export const QuizChoiceSchema = z.object({
  id: z.string().min(1, 'L’identifiant du choix est obligatoire'),
  text: z.string().min(1, 'Le texte du choix est obligatoire'),
});

export const QuizQuestionSchema = z
  .object({
    kind: z.enum(['single', 'multiple']).default('single'),
    prompt: z.string().min(1, 'L’énoncé de la question est obligatoire'),
    choices: z.array(QuizChoiceSchema).min(2, 'Une question doit comporter au moins 2 choix'),
    correct: z.array(z.string().min(1)).min(1, 'Au moins une réponse correcte est obligatoire'),
    explanation: z.string().optional().nullable(),
    position: z.number().int().min(0).optional(),
  })
  .superRefine((question, ctx) => {
    const choiceIds = new Set(question.choices.map((c) => c.id));
    for (const correctId of question.correct) {
      if (!choiceIds.has(correctId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `L'identifiant de réponse correcte "${correctId}" n'existe pas dans les choix proposés (${Array.from(choiceIds).join(', ')})`,
          path: ['correct'],
        });
      }
    }
    if (question.kind === 'single' && question.correct.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Une question de type "single" doit avoir exactement 1 réponse correcte',
        path: ['correct'],
      });
    }
  });

export const QuizSchema = z.object({
  slug: z
    .string()
    .min(1, 'Le slug est obligatoire')
    .regex(SLUG_REGEX, 'Le slug doit être en kebab-case (ex: quiz-adressage)'),
  title: z.string().min(1, 'Le titre est obligatoire'),
  passing_score: z
    .number()
    .int()
    .min(0, 'Le seuil de réussite minimal est 0 %')
    .max(100, 'Le seuil de réussite maximal est 100 %')
    .default(80),
  position: z.number().int().min(0).default(0),
  questions: z.array(QuizQuestionSchema).min(1, 'Un quiz doit comporter au moins 1 question'),
});

export type QuizChoice = z.infer<typeof QuizChoiceSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizInput = z.input<typeof QuizSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
