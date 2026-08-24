import { z } from 'zod';
import { LabFileItemSchema } from './save-files.dto';

export const ValidateLabSessionSchema = z.object({
  files: z.array(LabFileItemSchema).optional(),
});

export type ValidateLabSessionDto = z.infer<typeof ValidateLabSessionSchema>;
