import { z } from 'zod';

export const GradeAttemptSchema = z.object({
  attemptId: z.string().min(1, 'attemptId is required'),
  grades: z
    .array(
      z.object({
        questionId: z.string().min(1, 'questionId is required'),
        // Max 100 is a schema-level guard; the data layer enforces per-question
        // upper bound against the question's own `points` field.
        pointsAwarded: z
          .number()
          .int('Points must be an integer')
          .min(0, 'Points must be ≥ 0')
          .max(100, 'Points must be ≤ 100'),
      }),
    )
    .min(1, 'At least one grade is required'),
});

export type GradeAttemptInput = z.infer<typeof GradeAttemptSchema>;

export type GradeItem = GradeAttemptInput['grades'][number];
