import { apiFetch } from './api-client';

export interface LessonProgress {
  lessonId: string;
  lessonSlug: string;
  title?: string;
  status: 'started' | 'completed';
  timeSpentSeconds: number;
  completedAt: string | null;
  updatedAt: string;
}

export interface ModuleProgress {
  moduleId: string;
  moduleSlug: string;
  title: string;
  trackSlug: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  isCompleted: boolean;
  quizPassed: boolean;
  quizBestScore: number | null;
}

export interface TrackProgress {
  trackId: string;
  trackSlug: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  modulesCount: number;
  completedModulesCount: number;
}

export interface GlobalProgress {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  totalTimeSpentSeconds: number;
  totalModules: number;
  completedModules: number;
  quizzesPassed: number;
  totalQuizzes: number;
}

export interface DashboardResumeItem {
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  moduleSlug: string;
  moduleTitle: string;
  trackSlug: string;
  difficulty: number;
  estimatedMinutes: number;
  status: 'started' | 'completed';
  timeSpentSeconds: number;
  updatedAt: string;
}

export interface DashboardRecentQuiz {
  attemptId: string;
  quizId: string;
  quizSlug: string;
  quizTitle: string;
  moduleSlug: string;
  score: number;
  passed: boolean;
  passingScore: number;
  completedAt: string;
}

export interface DashboardRecommendation {
  id: string;
  kind: 'continue_module' | 'retry_quiz' | 'take_quiz' | 'start_learning' | 'review_module';
  title: string;
  description: string;
  href: string;
  priority: number;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardData {
  overview: GlobalProgress;
  tracksProgress: TrackProgress[];
  resume: DashboardResumeItem[];
  recentQuizzes: DashboardRecentQuiz[];
  recentActivity: ActivityEvent[];
  recommendations: DashboardRecommendation[];
}

export interface UserProgressTree {
  global: GlobalProgress;
  tracks: (TrackProgress & { modules: (ModuleProgress & { lessons: LessonProgress[] })[] })[];
}

export async function fetchDashboard(token: string | null): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/v1/me/dashboard', { token });
}

export async function fetchUserProgress(token: string | null): Promise<UserProgressTree> {
  return apiFetch<UserProgressTree>('/api/v1/me/progress', { token });
}

export async function completeLesson(
  lessonSlug: string,
  timeSpentSeconds: number | undefined,
  token: string | null,
): Promise<LessonProgress> {
  return apiFetch<LessonProgress>(`/api/v1/lessons/${encodeURIComponent(lessonSlug)}/complete`, {
    method: 'POST',
    token,
    body: JSON.stringify(timeSpentSeconds !== undefined ? { timeSpentSeconds } : {}),
  });
}

export async function sendLessonHeartbeat(
  lessonSlug: string,
  seconds: number,
  token: string | null,
): Promise<LessonProgress> {
  return apiFetch<LessonProgress>(`/api/v1/lessons/${encodeURIComponent(lessonSlug)}/heartbeat`, {
    method: 'POST',
    token,
    body: JSON.stringify({ seconds }),
  });
}

export async function fetchLessonProgress(
  lessonSlug: string,
  token: string | null,
): Promise<LessonProgress> {
  return apiFetch<LessonProgress>(`/api/v1/lessons/${encodeURIComponent(lessonSlug)}/progress`, {
    token,
  });
}
