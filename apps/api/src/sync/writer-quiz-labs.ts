import { Prisma, Lesson } from '@prisma/client';
import type { ScannedQuiz, ScannedLesson, SyncReport } from './types.js';
import { mapQuestionKind } from './writer-mappers.js';

export async function syncQuizQuestions(
  tx: Prisma.TransactionClient,
  quizRecordId: string,
  sq: ScannedQuiz,
  stats: SyncReport['stats']
): Promise<void> {
  const activePositions: number[] = [];
  for (let qIdx = 0; qIdx < sq.quiz.questions.length; qIdx++) {
    const q = sq.quiz.questions[qIdx];
    const pos = q.position ?? qIdx + 1;
    activePositions.push(pos);
    const mappedKind = mapQuestionKind(q.kind);

    const existingQ = await tx.quizQuestion.findUnique({
      where: {
        quizId_position: {
          quizId: quizRecordId,
          position: pos,
        },
      },
    });

    if (!existingQ) {
      await tx.quizQuestion.create({
        data: {
          quizId: quizRecordId,
          kind: mappedKind,
          prompt: q.prompt,
          choices: q.choices,
          correctChoiceIds: q.correct,
          explanation: q.explanation ?? null,
          position: pos,
        },
      });
      stats.quizQuestions.created++;
    } else {
      const isChanged =
        existingQ.prompt !== q.prompt ||
        existingQ.kind !== mappedKind ||
        existingQ.explanation !== (q.explanation ?? null) ||
        JSON.stringify(existingQ.choices) !== JSON.stringify(q.choices) ||
        JSON.stringify(existingQ.correctChoiceIds) !== JSON.stringify(q.correct);

      if (isChanged) {
        await tx.quizQuestion.update({
          where: { id: existingQ.id },
          data: {
            kind: mappedKind,
            prompt: q.prompt,
            choices: q.choices,
            correctChoiceIds: q.correct,
            explanation: q.explanation ?? null,
          },
        });
        stats.quizQuestions.updated++;
      } else {
        stats.quizQuestions.unchanged++;
      }
    }
  }

  const delQuestions = await tx.quizQuestion.deleteMany({
    where: {
      quizId: quizRecordId,
      position: { notIn: activePositions },
    },
  });
  stats.quizQuestions.deleted += delQuestions.count;
}

export async function syncLessonLabAssociations(
  tx: Prisma.TransactionClient,
  lesson: Lesson,
  sl: ScannedLesson,
  stats: SyncReport['stats']
): Promise<void> {
  const activeLabIds = new Set<string>();
  for (let i = 0; i < sl.frontMatter.labs.length; i++) {
    const labRef = sl.frontMatter.labs[i];
    const lab = await tx.lab.findUnique({ where: { slug: labRef.slug } });
    if (lab) {
      activeLabIds.add(lab.id);
      const labPos = labRef.position ?? i + 1;
      const existingLL = await tx.lessonLab.findUnique({
        where: {
          lessonId_labId: {
            lessonId: lesson.id,
            labId: lab.id,
          },
        },
      });

      if (!existingLL) {
        await tx.lessonLab.create({
          data: {
            lessonId: lesson.id,
            labId: lab.id,
            required: labRef.required,
            position: labPos,
          },
        });
        stats.lessonLabs.created++;
      } else {
        if (existingLL.required !== labRef.required || existingLL.position !== labPos) {
          await tx.lessonLab.update({
            where: {
              lessonId_labId: {
                lessonId: lesson.id,
                labId: lab.id,
              },
            },
            data: {
              required: labRef.required,
              position: labPos,
            },
          });
          stats.lessonLabs.updated++;
        } else {
          stats.lessonLabs.unchanged++;
        }
      }
    }
  }

  const delLL = await tx.lessonLab.deleteMany({
    where: {
      lessonId: lesson.id,
      labId: { notIn: Array.from(activeLabIds) },
    },
  });
  stats.lessonLabs.deleted += delLL.count;
}
