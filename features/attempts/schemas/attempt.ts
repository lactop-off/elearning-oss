import { z } from 'zod';

export const SubmitAttemptSchema = z.object({
  attemptId: z.string().min(1),
  // For SINGLE_CHOICE: choiceIds has exactly 1 element.
  // For MULTI_CHOICE: choiceIds has 1+ elements (the learner's pick).
  // Empty answers are dropped client-side and never sent.
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        choiceIds: z
          .array(z.string().min(1))
          .min(1, 'At least one choice required per answered question')
          .max(6, 'Too many choices for one answer'),
      }),
    )
    .min(1, 'At least one answer is required'),
});

export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>;
