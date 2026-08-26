import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

export const updateUserSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Le nom d\'affichage doit comporter au moins 2 caractères')
    .max(100, 'Le nom d\'affichage ne doit pas dépasser 100 caractères')
    .optional(),
  email: z.string().trim().email('Format d\'adresse email invalide').toLowerCase().optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
