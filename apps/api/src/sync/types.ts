import type {
  Track,
  Module,
  LessonFrontMatter,
  Quiz,
  Lab,
  LocalizedValidationError,
} from '@opensio/content-schema';

export interface ScannedLesson {
  frontMatter: LessonFrontMatter;
  body: string;
  relativePath: string;
  gitHash: string;
}

export interface ScannedQuiz {
  quiz: Quiz;
  relativePath: string;
}

export interface ScannedLab {
  lab: Lab;
  relativePath: string;
  gitHash: string;
}

export interface ScannedModule {
  module: Module;
  relativePath: string;
  gitHash: string;
  lessons: ScannedLesson[];
  quizzes: ScannedQuiz[];
  labs: ScannedLab[];
}

export interface ScannedTrack {
  track: Track;
  relativePath: string;
  gitHash: string;
  modules: ScannedModule[];
}

export interface ScannedContent {
  tracks: ScannedTrack[];
  errors: LocalizedValidationError[];
}

export interface EntitySyncStats {
  created: number;
  updated: number;
  unchanged: number;
  deleted: number;
}

export interface SyncReport {
  success: boolean;
  durationMs: number;
  stats: {
    tracks: EntitySyncStats;
    modules: EntitySyncStats;
    lessons: EntitySyncStats;
    quizzes: EntitySyncStats;
    quizQuestions: EntitySyncStats;
    labs: EntitySyncStats;
    lessonLabs: EntitySyncStats;
  };
  errors: LocalizedValidationError[];
}
