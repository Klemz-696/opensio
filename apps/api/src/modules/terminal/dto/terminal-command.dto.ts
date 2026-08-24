import { z } from 'zod';

export const terminalCommandSchema = z.object({
  command: z.string().max(1000, 'La commande ne doit pas dépasser 1000 caractères'),
});

export type TerminalCommandDto = z.infer<typeof terminalCommandSchema>;
