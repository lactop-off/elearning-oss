'use server';

import { revalidatePath } from 'next/cache';

import { finalizeGradedAttempt } from '@/features/attempts/data/grading';
import { GradeAttemptSchema } from '@/features/attempts/schemas/grade';
import { checkAndMarkComplete } from '@/features/completions/data/completions';
import { findEnrollmentByCourse } from '@/features/enrollments/data/enrollments';
import { AuthError, requireRole } from '@/lib/auth';

// ─── Return type ──────────────────────────────────────────────────────────────

type GradeAttemptResult =
  | { ok: true; data: { score: number; passed: boolean } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'NOT_PENDING'
        | 'INVALID_GRADES'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

// ─── Action ───────────────────────────────────────────────────────────────────

export async function gradeAttemptAction(input: unknown): Promise<GradeAttemptResult> {
  // 1. Input validation
  const parsed = GradeAttemptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  // 2. Auth: only instructors and admins may grade
  let user;
  try {
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    throw e;
  }

  // 3. Business logic
  let result;
  try {
    result = await finalizeGradedAttempt({
      attemptId: parsed.data.attemptId,
      instructorId: user.id,
      grades: parsed.data.grades,
    });
  } catch (e) {
    console.error('[gradeAttemptAction:finalize]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }

  // 4. Map data-layer errors to action-layer error codes
  if ('error' in result) {
    switch (result.error) {
      case 'NOT_FOUND':
        return { ok: false, error: 'NOT_FOUND' };
      case 'NOT_OWNED':
        return { ok: false, error: 'FORBIDDEN' };
      case 'NOT_PENDING':
        return { ok: false, error: 'NOT_PENDING' };
      case 'INVALID_GRADES':
        return { ok: false, error: 'INVALID_GRADES' };
    }
  }

  // 5. If the learner passed, attempt the completion check.
  //    Failures here are non-fatal — the grade itself was recorded successfully.
  if (result.passed && result.courseId) {
    try {
      const enrollment = await findEnrollmentByCourse(result.learnerUserId, result.courseId);
      if (enrollment) {
        const completion = await checkAndMarkComplete(
          enrollment.enrollmentId,
          result.learnerUserId,
        );
        if (completion.wasMarkedComplete) {
          revalidatePath('/learn');
        }
      }
    } catch (e) {
      console.error('[gradeAttemptAction:completionCheck]', e);
    }
  }

  // 6. Revalidate affected paths
  revalidatePath('/instructor/grading');
  revalidatePath(`/instructor/grading/${parsed.data.attemptId}`);

  return { ok: true, data: { score: result.score, passed: result.passed } };
}
