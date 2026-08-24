export interface QuizChoice {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  kind: 'single' | 'multiple';
  prompt: string;
  choices: QuizChoice[];
  position: number;
}

export interface QuizDetail {
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
  questions: QuizQuestion[];
}

export interface QuizQuestionCorrection {
  questionId: string;
  prompt: string;
  kind: 'single' | 'multiple';
  userAnswers: string[];
  isCorrect: boolean;
  explanation: string | null;
}

export interface QuizAttemptResult {
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
  questions: QuizQuestionCorrection[];
}

export interface QuizAttemptHistoryItem {
  id: string;
  score: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
}

const API_BASE = '/api/v1';

/**
 * Récupère les données d'un quiz pour passation (zéro fuite côté serveur).
 */
export async function fetchQuiz(quizSlug: string, accessToken: string): Promise<QuizDetail> {
  const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizSlug)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Erreur réseau' }));
    throw new Error(errorData.detail || errorData.message || 'Impossible de récupérer le quiz.');
  }

  return res.json();
}

/**
 * Soumet les réponses d'un utilisateur à un quiz pour correction immédiate.
 */
export async function submitQuizAttempt(
  quizSlug: string,
  answers: Record<string, string[]>,
  accessToken: string,
  idempotencyKey?: string,
): Promise<QuizAttemptResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizSlug)}/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answers }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Erreur lors de la soumission' }));
    throw new Error(errorData.detail || errorData.message || 'Erreur lors de la soumission du quiz.');
  }

  return res.json();
}

/**
 * Récupère l'historique des tentatives d'un quiz.
 */
export async function fetchQuizHistory(
  quizSlug: string,
  accessToken: string,
): Promise<QuizAttemptHistoryItem[]> {
  const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizSlug)}/attempts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}
