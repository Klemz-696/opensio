export interface LabEditableFileInfo {
  path: string;
  description?: string;
  initialContent?: string;
}

export interface LabHintSummary {
  index: number;
  costPercent: number;
}

export interface LabUnlockedHintDto {
  index: number;
  costPercent: number;
  text: string;
}

export interface LabCheckSummary {
  id: string;
  required: boolean;
  points: number;
  description?: string;
}

export interface LabPublicDetailDto {
  id: string;
  slug: string;
  title: string;
  level: string;
  maxScore: number;
  estimatedMinutes: number;
  context: string;
  objectives: string[];
  prerequisites: string[];
  topology: string | null;
  editableFiles: LabEditableFileInfo[];
  hintsCount: number;
  hintsSummary: LabHintSummary[];
  scoring: {
    floorPercent: number;
  };
  checksSummary: LabCheckSummary[];
  activeSessionId?: string | null;
  bestScore?: number | null;
  isCompleted?: boolean;
}

export interface LabSessionDto {
  id: string;
  labId: string;
  labSlug: string;
  labTitle: string;
  labLevel: string;
  userId: string;
  status: 'running' | 'passed' | 'failed' | 'expired' | 'cleaned';
  score: number | null;
  hintsUsed: number;
  totalHints: number;
  unlockedHints: LabUnlockedHintDto[];
  files: Array<{ path: string; content: string }>;
  lastResult: {
    passed: boolean;
    score: number;
    checks: Array<{
      id: string;
      passed: boolean;
      points: number;
      message: string;
    }>;
  } | null;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export interface LabVerdictDto {
  passed: boolean;
  score: number;
  status: 'running' | 'passed' | 'failed' | 'expired' | 'cleaned';
  checks: Array<{
    id: string;
    passed: boolean;
    points: number;
    message: string;
  }>;
}

export interface LabHintResponseDto {
  hintIndex: number;
  costPercent: number;
  text: string;
  hintsUsed: number;
  totalHints: number;
}
