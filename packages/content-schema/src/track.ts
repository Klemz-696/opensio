import { z } from 'zod';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const TrackSchema = z.object({
  slug: z
    .string()
    .min(1, 'Le slug est obligatoire')
    .regex(SLUG_REGEX, 'Le slug doit être en kebab-case (ex: annee-1)'),
  title: z.string().min(1, 'Le titre est obligatoire'),
  description: z.string().optional().nullable(),
  position: z.number().int().min(0).default(0),
});

export type TrackInput = z.input<typeof TrackSchema>;
export type Track = z.infer<typeof TrackSchema>;
