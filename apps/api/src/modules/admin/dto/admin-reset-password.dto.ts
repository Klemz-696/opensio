import { z } from 'zod';

export const adminResetPasswordSchema = z.object({
  temporaryPassword: z
    .string()
    .min(8, 'Le mot de passe temporaire doit comporter au moins 8 caractères')
    .optional(),
});

export type AdminResetPasswordDto = z.infer<typeof adminResetPasswordSchema>;

export interface AdminResetPasswordResponse {
  temporaryPassword: string;
  message: string;
}
