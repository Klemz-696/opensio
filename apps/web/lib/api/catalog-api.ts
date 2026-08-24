import { apiFetch } from './api-client';

export interface TrackSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  modulesCount: number;
  progress?: null;
}

export interface ModuleSummary {
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

export interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  estimatedMinutes: number;
  position: number;
}

export interface QuizSummary {
  id: string;
  slug: string;
  title: string;
  passingScore: number;
  position: number;
  questionsCount: number;
}

export interface LabSummary {
  id: string;
  slug: string;
  title: string;
  level: string;
  maxScore: number;
  estimatedMinutes: number;
}

export interface ModuleDetail {
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
  lessons: LessonSummary[];
  quizzes: QuizSummary[];
  labs: LabSummary[];
}

export interface LessonDetail {
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
  relatedLabs: LabSummary[];
}

export async function fetchTracks(token: string | null): Promise<TrackSummary[]> {
  return apiFetch<TrackSummary[]>('/api/v1/tracks', { token });
}

export async function fetchTrackModules(
  trackSlug: string,
  token: string | null,
): Promise<ModuleSummary[]> {
  return apiFetch<ModuleSummary[]>(`/api/v1/tracks/${encodeURIComponent(trackSlug)}/modules`, { token });
}

export async function fetchModule(
  moduleSlug: string,
  token: string | null,
): Promise<ModuleDetail> {
  return apiFetch<ModuleDetail>(`/api/v1/modules/${encodeURIComponent(moduleSlug)}`, { token });
}

export async function fetchLesson(
  lessonSlug: string,
  token: string | null,
): Promise<LessonDetail> {
  return apiFetch<LessonDetail>(`/api/v1/lessons/${encodeURIComponent(lessonSlug)}`, { token });
}
