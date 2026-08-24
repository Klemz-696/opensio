export interface QuizChoiceDto {
  id: string;
  text: string;
}

export interface QuizQuestionDto {
  id: string;
  kind: 'single' | 'multiple';
  prompt: string;
  choices: QuizChoiceDto[];
  position: number;
}

export interface QuizDetailDto {
  id: string;
  slug: string;
  title: string;
  passingScore: number;
  position: number;
  module: {
    id: string;
    slug: string;
    title: string;
    track: {
      slug: string;
    };
  };
  questions: QuizQuestionDto[];
}

export interface QuizQuestionCorrectionDto {
  questionId: string;
  prompt: string;
  kind: 'single' | 'multiple';
  userAnswers: string[];
  isCorrect: boolean;
  explanation: string | null;
}

export interface QuizAttemptResultDto {
  id: string;
  quizId: string;
  quizSlug: string;
  score: number;
  passed: boolean;
  passingScore: number;
  totalQuestions: number;
  correctQuestions: number;
  startedAt: string;
  completedAt: string;
  questions: QuizQuestionCorrectionDto[];
}

export interface QuizAttemptHistoryItemDto {
  id: string;
  score: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
}
