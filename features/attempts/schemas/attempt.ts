import { z } from 'zod';

/**
 * One answer carries either choice ids (for SINGLE/MULTI_CHOICE questions)
 * or a free-text string (for TEXT questions). Exactly one of the two must
 * be provided; empty answers are dropped client-side and never sent.
 */
const AnswerSchema = z
  .object({
    questionId: z.string().min(1),
    choiceIds: z
      .array(z.string().min(1))
      .min(1, 'At least one choice required per answered question')
      .max(6, 'Too many choices for one answer')
      .optional(),
    textAnswer: z
      .string()
      .min(1, 'Text answer cannot be empty')
      .max(5000, 'Text answer is too long')
      .optional(),
  })
  .refine(
    (a) =>
      (a.choiceIds !== undefined && a.choiceIds.length > 0) ||
      (a.textAnswer !== undefined && a.textAnswer.length > 0),
    { message: 'Answer must include either choiceIds or textAnswer' },
  )
  .refine((a) => !(a.choiceIds !== undefined && a.textAnswer !== undefined), {
    message: 'Answer must not include both choiceIds and textAnswer',
  });

export const SubmitAttemptSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(AnswerSchema).min(1, 'At least one answer is required'),
});

export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>;
