import { LabLevel } from '@prisma/client';

export interface TrackSummaryDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  modulesCount: number;
  /**
   * Note Lot 4 : La progression agrégée arrive au Lot 6 (B08).
   * La structure est livrée sans calcul de pourcentages.
   */
  progress?: null;
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
}

export interface LessonSummaryDto {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  estimatedMinutes: number;
  position: number;
}

export interface QuizSummaryDto {
  id: string;
  slug: string;
  title: string;
  passingScore: number;
  position: number;
  questionsCount: number;
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
}
