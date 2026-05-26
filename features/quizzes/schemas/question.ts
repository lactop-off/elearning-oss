import { z } from 'zod';

export const AddSingleChoiceQuestionSchema = z
  .object({
    quizId: z.string().min(1),
    body: z.string().min(1, 'Question is required').max(1000, 'Question is too long'),
    points: z
      .number()
      .int()
      .min(1, 'Points must be ≥ 1')
      .max(100, 'Points must be ≤ 100')
      .default(1),
    choices: z
      .array(
        z.object({
          body: z.string().min(1, 'Choice text is required').max(500, 'Choice is too long'),
        }),
      )
      .min(2, 'A question needs at least 2 choices')
      .max(6, 'A question can have at most 6 choices'),
    correctChoiceIndex: z
      .number()
      .int()
      .min(0, 'Pick a correct choice')
      .max(5, 'Choice index out of range'),
  })
  .refine((data) => data.correctChoiceIndex < data.choices.length, {
    message: 'Correct choice index must point at an actual choice',
    path: ['correctChoiceIndex'],
  });

export type AddSingleChoiceQuestionInput = z.infer<typeof AddSingleChoiceQuestionSchema>;
