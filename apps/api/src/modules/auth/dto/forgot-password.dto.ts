import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'L\'email est obligatoire' })
    .email('Adresse email invalide')
    .trim()
    .toLowerCase(),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
