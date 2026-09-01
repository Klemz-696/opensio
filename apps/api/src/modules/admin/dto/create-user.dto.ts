import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  email: z.string().trim().email('Format d\'adresse email invalide').toLowerCase(),
  displayName: z
    .string()
    .trim()
    .min(2, 'Le nom d\'affichage doit comporter au moins 2 caractères')
    .max(100, 'Le nom d\'affichage ne doit pas dépasser 100 caractères'),
  role: z.nativeEnum(Role).default(Role.APPRENANT),
  temporaryPassword: z.string().min(8, 'Le mot de passe temporaire doit comporter au moins 8 caractères').optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

export interface CreateUserResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: Role;
    status: string;
    mustChangePassword: boolean;
    createdAt: Date;
  };
  temporaryPassword: string;
}
