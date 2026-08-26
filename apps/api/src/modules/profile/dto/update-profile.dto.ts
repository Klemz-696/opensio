import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Le nom d\'affichage doit contenir au moins 2 caractères')
    .max(50, 'Le nom d\'affichage ne peut pas dépasser 50 caractères')
    .trim()
    .optional(),
  bio: z
    .string()
    .max(500, 'La biographie ne peut pas dépasser 500 caractères')
    .trim()
    .nullable()
    .optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
