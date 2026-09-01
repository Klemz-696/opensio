import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type ListUsersDto = z.infer<typeof listUsersSchema>;

export interface UserItemDto {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface PaginatedUsersResponse {
  items: UserItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
