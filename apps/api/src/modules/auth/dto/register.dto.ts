import { z } from 'zod';

export function isPasswordPolicyValid(password: string): boolean {
  if (password.length < 12) return false;

  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^a-zA-Z0-9]/.test(password)) classes++;

  return classes >= 3;
}

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'L\'email est obligatoire' })
    .email('Adresse email invalide')
    .trim()
    .toLowerCase(),
  displayName: z
    .string({ required_error: 'Le nom d\'affichage est obligatoire' })
    .min(2, 'Le nom d\'affichage doit contenir au moins 2 caractères')
    .max(50, 'Le nom d\'affichage ne peut pas dépasser 50 caractères')
    .trim(),
  password: z
    .string({ required_error: 'Le mot de passe est obligatoire' })
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .refine(
      isPasswordPolicyValid,
      'Le mot de passe doit contenir au moins 3 catégories de caractères : minuscules, majuscules, chiffres, caractères spéciaux',
    ),
});

export type RegisterDto = z.infer<typeof registerSchema>;
