import { z } from 'zod';
import { SLUG_REGEX } from './track.js';

export const LabEditableFileSchema = z.object({
  path: z
    .string()
    .min(1, 'Le chemin du fichier est obligatoire')
    .refine((p) => !p.includes('..'), 'Les chemins relatifs avec ".." sont interdits pour des raisons de sécurité'),
  description: z.string().optional(),
});

export const LabHintSchema = z.object({
  cost_percent: z
    .number()
    .int()
    .min(0, 'Le coût minimal est 0 %')
    .max(100, 'Le coût maximal est 100 %')
    .default(10),
  text: z.string().min(1, 'Le texte de l’indice est obligatoire'),
});

export const LabValidationCheckSchema = z.object({
  id: z.string().min(1, 'L’identifiant du contrôle est obligatoire'),
  required: z.boolean().default(false),
  points: z.number().int().min(0, 'Les points attribués doivent être positifs ou nuls').default(0),
  description: z.string().optional(),
});

export const LabValidationSchema = z.object({
  type: z.enum(['script', 'manual']).default('script'),
  image: z.string().optional().nullable(),
  timeout_seconds: z.number().int().min(1).max(300).default(30),
  checks: z.array(LabValidationCheckSchema).default([]),
});

export const LabScoringSchema = z.object({
  floor_percent: z
    .number()
    .int()
    .min(0, 'Le plancher de score minimal est 0 %')
    .max(100, 'Le plancher de score maximal est 100 %')
    .default(50),
});

export const LabSchema = z.object({
  slug: z
    .string()
    .min(1, 'Le slug est obligatoire')
    .regex(SLUG_REGEX, 'Le slug doit être en kebab-case (ex: plan-adressage-pme)'),
  title: z.string().min(1, 'Le titre est obligatoire'),
  level: z.enum(['1_theory', '2_files', '3_container', '4_vm']).default('1_theory'),
  max_score: z.number().int().min(1, 'Le score maximal doit être au moins 1').default(100),
  estimated_minutes: z.number().int().min(0).default(0),
  context: z.string().min(1, 'Le contexte du lab est obligatoire'),
  objectives: z.array(z.string().min(1)).min(1, 'Au moins 1 objectif est obligatoire'),
  prerequisites: z.array(z.string().min(1)).default([]),
  topology: z.string().optional().nullable(),
  files: z
    .object({
      editable: z.array(LabEditableFileSchema).default([]),
    })
    .optional()
    .nullable(),
  hints: z.array(LabHintSchema).default([]),
  validation: LabValidationSchema.default({
    type: 'script',
    timeout_seconds: 30,
    checks: [],
  }),
  scoring: LabScoringSchema.default({
    floor_percent: 50,
  }),
});

export type LabEditableFile = z.infer<typeof LabEditableFileSchema>;
export type LabHint = z.infer<typeof LabHintSchema>;
export type LabValidationCheck = z.infer<typeof LabValidationCheckSchema>;
export type LabValidation = z.infer<typeof LabValidationSchema>;
export type LabScoring = z.infer<typeof LabScoringSchema>;
export type LabInput = z.input<typeof LabSchema>;
export type Lab = z.infer<typeof LabSchema>;
