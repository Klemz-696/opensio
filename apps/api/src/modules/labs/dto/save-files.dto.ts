import { z } from 'zod';

export const LabFileItemSchema = z.object({
  path: z
    .string()
    .min(1, 'Le chemin du fichier est obligatoire')
    .refine(
      (p) => !p.includes('..') && !p.startsWith('/') && !p.startsWith('\\'),
      'Les chemins relatifs suspects ou absolus sont interdits'
    ),
  content: z.string(),
});

export const SaveLabFilesSchema = z.object({
  files: z
    .array(LabFileItemSchema)
    .min(1, 'Au moins un fichier doit être fourni pour la sauvegarde'),
});

export type SaveLabFilesDto = z.infer<typeof SaveLabFilesSchema>;
export type LabFileItemDto = z.infer<typeof LabFileItemSchema>;
