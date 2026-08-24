export interface ChatStatusResponse {
  enabled: boolean;
  provider: string;
  mode: 'local' | 'remote' | 'disabled';
  model: string;
  remainingQuota: number;
  rateLimitHourly: number;
  privacyNotice: string;
}
