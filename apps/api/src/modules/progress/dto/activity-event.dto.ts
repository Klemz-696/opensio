export interface ActivityEventDto {
  id: string;
  kind: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedActivityEventsDto {
  items: ActivityEventDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
