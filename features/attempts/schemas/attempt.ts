import { z } from 'zod';

export const SubmitAttemptSchema = z.object({
  attemptId: z.string().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        choiceId: z.string().min(1),
      }),
    )
    .min(1, 'At least one answer is required'),
});

export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>;
