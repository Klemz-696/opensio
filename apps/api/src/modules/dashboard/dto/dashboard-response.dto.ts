import type { ActivityEventDto } from '../../progress/dto/activity-event.dto';
import type {
  GlobalProgressDto,
  TrackProgressDto,
} from '../../progress/dto/progress-responses.dto';

export interface DashboardResumeItemDto {
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

export interface DashboardRecentQuizDto {
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

export type RecommendationKind =
  | 'continue_module'
  | 'retry_quiz'
  | 'take_quiz'
  | 'start_learning'
  | 'review_module';

export interface DashboardRecommendationDto {
  id: string;
  kind: RecommendationKind;
  title: string;
  description: string;
  href: string;
  priority: number;
}

export interface DashboardResponseDto {
  overview: GlobalProgressDto;
  tracksProgress: TrackProgressDto[];
  resume: DashboardResumeItemDto[];
  recentQuizzes: DashboardRecentQuizDto[];
  recentActivity: ActivityEventDto[];
  recommendations: DashboardRecommendationDto[];
}
