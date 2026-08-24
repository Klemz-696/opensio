import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'L\'email est obligatoire' })
    .email('Adresse email invalide')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Le mot de passe est obligatoire' })
    .min(1, 'Le mot de passe ne peut pas être vide'),
});

export type LoginDto = z.infer<typeof loginSchema>;
