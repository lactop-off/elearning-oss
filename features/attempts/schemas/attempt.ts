import { z } from 'zod';

const AnswerItemSchema = z
  .object({
    questionId: z.string().min(1),
    // For SINGLE_CHOICE / MULTI_CHOICE: 1-6 choice IDs.
    choiceIds: z.array(z.string().min(1)).min(1).max(6).optional(),
    // For TEXT questions: the learner's written answer (1-5000 chars).
    textAnswer: z.string().min(1).max(5000).optional(),
  })
  .superRefine((data, ctx) => {
    const hasChoices = data.choiceIds !== undefined && data.choiceIds.length > 0;
    const hasText = data.textAnswer !== undefined && data.textAnswer.length > 0;

    if (hasChoices && hasText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either choiceIds or textAnswer, not both',
        path: ['choiceIds'],
      });
    }
    if (!hasChoices && !hasText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either choiceIds or textAnswer is required',
        path: ['choiceIds'],
      });
    }
  });

export const SubmitAttemptSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(AnswerItemSchema).min(1, 'At least one answer is required'),
});

export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>;
