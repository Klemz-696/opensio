import { z } from 'zod';
import { isPasswordPolicyValid } from './register.dto';

export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Le jeton de réinitialisation est obligatoire' })
    .min(1, 'Le jeton ne peut pas être vide'),
  newPassword: z
    .string({ required_error: 'Le nouveau mot de passe est obligatoire' })
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .refine(
      isPasswordPolicyValid,
      'Le mot de passe doit contenir au moins 3 catégories de caractères : minuscules, majuscules, chiffres, caractères spéciaux',
    ),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
