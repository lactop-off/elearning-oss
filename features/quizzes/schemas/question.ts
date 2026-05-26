import { z } from 'zod';

const BaseQuestion = z.object({
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
});

const SingleChoiceQuestion = BaseQuestion.extend({
  type: z.literal('SINGLE_CHOICE'),
  correctChoiceIndex: z
    .number()
    .int()
    .min(0, 'Pick a correct choice')
    .max(5, 'Choice index out of range'),
}).refine((data) => data.correctChoiceIndex < data.choices.length, {
  message: 'Correct choice index must point at an actual choice',
  path: ['correctChoiceIndex'],
});

const MultiChoiceQuestion = BaseQuestion.extend({
  type: z.literal('MULTI_CHOICE'),
  correctChoiceIndices: z
    .array(z.number().int().min(0).max(5))
    .min(1, 'Pick at least one correct choice')
    .max(6),
})
  .refine(
    (data) => data.correctChoiceIndices.every((i) => i < data.choices.length),
    {
      message: 'All correct indices must point at actual choices',
      path: ['correctChoiceIndices'],
    },
  )
  .refine(
    (data) => new Set(data.correctChoiceIndices).size === data.correctChoiceIndices.length,
    {
      message: 'Correct indices must not repeat',
      path: ['correctChoiceIndices'],
    },
  )
  .refine(
    (data) => data.correctChoiceIndices.length < data.choices.length,
    {
      message:
        'A multi-choice question with every choice correct is not a meaningful question — leave at least one incorrect',
      path: ['correctChoiceIndices'],
    },
  );

export const AddQuestionSchema = z.discriminatedUnion('type', [
  SingleChoiceQuestion,
  MultiChoiceQuestion,
]);

export type AddQuestionInput = z.infer<typeof AddQuestionSchema>;
export type AddSingleChoiceQuestionInput = Extract<AddQuestionInput, { type: 'SINGLE_CHOICE' }>;
export type AddMultiChoiceQuestionInput = Extract<AddQuestionInput, { type: 'MULTI_CHOICE' }>;
