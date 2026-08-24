import { LabLevel } from '@prisma/client';

export interface TrackProgressSummaryDto {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

export interface TrackSummaryDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  modulesCount: number;
  progress?: TrackProgressSummaryDto | null;
}

export interface ModuleProgressSummaryDto {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  isCompleted: boolean;
}

export interface ModuleSummaryDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  difficulty: number;
  estimatedMinutes: number;
  competencyRefs: string[];
  trackSlug: string;
  lessonsCount: number;
  progress?: ModuleProgressSummaryDto | null;
}

export interface LessonSummaryDto {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  estimatedMinutes: number;
  position: number;
  status?: 'started' | 'completed' | null;
}

export interface QuizSummaryDto {
  id: string;
  slug: string;
  title: string;
  passingScore: number;
  position: number;
  questionsCount: number;
  passed?: boolean;
  bestScore?: number | null;
}

export interface LabSummaryDto {
  id: string;
  slug: string;
  title: string;
  level: LabLevel;
  maxScore: number;
  estimatedMinutes: number;
}

export interface ModuleDetailDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  difficulty: number;
  estimatedMinutes: number;
  competencyRefs: string[];
  track: {
    id: string;
    slug: string;
    title: string;
  };
  lessons: LessonSummaryDto[];
  quizzes: QuizSummaryDto[];
  labs: LabSummaryDto[];
  progress?: ModuleProgressSummaryDto | null;
}

export interface LessonDetailDto {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  estimatedMinutes: number;
  position: number;
  objectives: string[];
  prerequisites: string[];
  competencyRefs: string[];
  successCriteria: string[];
  content: string;
  module: {
    id: string;
    slug: string;
    title: string;
    trackSlug: string;
  };
  relatedLabs: LabSummaryDto[];
  progress?: {
    status: 'started' | 'completed';
    timeSpentSeconds: number;
    completedAt: string | null;
  } | null;
}
