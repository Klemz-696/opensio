import { z } from 'zod';
import { SLUG_REGEX } from './track.js';

export const LessonLabReferenceSchema = z.object({
  slug: z
    .string()
    .min(1, 'Le slug du lab est obligatoire')
    .regex(SLUG_REGEX, 'Le slug du lab doit être en kebab-case'),
  required: z.boolean().default(false),
  position: z.number().int().min(0).optional(),
});

export const ReferenceItemSchema = z.object({
  label: z.string().min(1, 'Le label de référence est obligatoire'),
  url: z.string().url('L’URL de référence doit être valide'),
});

export const LessonFrontMatterSchema = z.object({
  slug: z
    .string()
    .min(1, 'Le slug est obligatoire')
    .regex(SLUG_REGEX, 'Le slug doit être en kebab-case (ex: 01-adressage-ipv4)'),
  title: z.string().min(1, 'Le titre est obligatoire'),
  version: z.string().default('1.0.0'),
  last_reviewed: z.string().optional(),
  difficulty: z
    .number()
    .int()
    .min(1, 'La difficulté minimale est 1')
    .max(5, 'La difficulté maximale est 5')
    .default(1),
  estimated_minutes: z.number().int().min(0).default(0),
  objectives: z.array(z.string().min(1)).default([]),
  prerequisites: z.array(z.string().min(1)).default([]),
  competency_refs: z.array(z.string().min(1)).default([]),
  success_criteria: z.array(z.string().min(1)).default([]),
  labs: z.array(LessonLabReferenceSchema).default([]),
  references: z.array(ReferenceItemSchema).default([]),
});

export type LessonLabReference = z.infer<typeof LessonLabReferenceSchema>;
export type ReferenceItem = z.infer<typeof ReferenceItemSchema>;
export type LessonFrontMatterInput = z.input<typeof LessonFrontMatterSchema>;
export type LessonFrontMatter = z.infer<typeof LessonFrontMatterSchema>;
