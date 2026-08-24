export interface LessonProgressDto {
  lessonId: string;
  lessonSlug: string;
  title?: string;
  status: 'started' | 'completed';
  timeSpentSeconds: number;
  completedAt: string | null;
  updatedAt: string;
}

export interface ModuleProgressDto {
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

export interface TrackProgressDto {
  trackId: string;
  trackSlug: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  modulesCount: number;
  completedModulesCount: number;
}

export interface GlobalProgressDto {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  totalTimeSpentSeconds: number;
  totalModules: number;
  completedModules: number;
  quizzesPassed: number;
  totalQuizzes: number;
}

export interface ModuleProgressTreeDto extends ModuleProgressDto {
  lessons: LessonProgressDto[];
}

export interface TrackProgressTreeDto extends TrackProgressDto {
  modules: ModuleProgressTreeDto[];
}

export interface UserProgressTreeDto {
  global: GlobalProgressDto;
  tracks: TrackProgressTreeDto[];
}
