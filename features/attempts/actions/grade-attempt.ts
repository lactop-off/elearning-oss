'use server';

import { revalidatePath } from 'next/cache';

import { gradeAttemptAnswers } from '@/features/attempts/data/attempts';
import { GradeAttemptSchema } from '@/features/attempts/schemas/grade-attempt';
import { checkAndMarkComplete } from '@/features/completions/data/completions';
import { findEnrollment } from '@/features/enrollments/data/enrollments';
import { AuthError, requireRole } from '@/lib/auth';

type GradeAttemptResult =
  | {
      ok: true;
      data: { score: number; passed: boolean; courseSlug: string };
    }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'NOT_PENDING'
        | 'INVALID_GRADINGS'
        | 'POINTS_EXCEED'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function gradeAttemptAction(input: unknown): Promise<GradeAttemptResult> {
  const parsed = GradeAttemptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  let user;
  try {
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    throw e;
  }

  let outcome;
  try {
    outcome = await gradeAttemptAnswers({
      attemptId: parsed.data.attemptId,
      instructorId: user.id,
      gradings: parsed.data.gradings,
    });
  } catch (e) {
    console.error('[gradeAttemptAction:grade]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
  if ('error' in outcome) {
    return { ok: false, error: outcome.error };
  }

  // If this grading flipped the attempt to passed, re-check course completion
  // so a freshly-met required quiz issues the certificate. Failures here
  // mustn't surface — the grade is already saved.
  if (outcome.passed) {
    try {
      const enrollment = await findEnrollment(outcome.userId, outcome.courseId);
      if (enrollment) {
        const completion = await checkAndMarkComplete(enrollment.id, outcome.userId);
        if (completion.wasMarkedComplete) {
          revalidatePath('/learn');
        }
      }
    } catch (e) {
      console.error('[gradeAttemptAction:completionCheck]', e);
    }
  }

  // Revalidate both learner and instructor surfaces that show this attempt.
  revalidatePath(`/learn/${outcome.courseSlug}/quizzes/${parsed.data.attemptId}`);
  revalidatePath(`/learn/${outcome.courseSlug}`);
  revalidatePath(`/instructor/courses/${outcome.courseSlug}`);
  return {
    ok: true,
    data: {
      score: outcome.score,
      passed: outcome.passed,
      courseSlug: outcome.courseSlug,
    },
  };
}
