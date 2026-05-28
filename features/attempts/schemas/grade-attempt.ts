import { z } from 'zod';

export const GradeAttemptSchema = z.object({
  attemptId: z.string().min(1),
  gradings: z
    .array(
      z.object({
        answerId: z.string().min(1),
        isCorrect: z.boolean(),
        pointsAwarded: z.number().int().min(0).max(100),
      }),
    )
    .min(1, 'At least one grading is required'),
});

export type GradeAttemptInput = z.infer<typeof GradeAttemptSchema>;
