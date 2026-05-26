import { z } from 'zod';

export const CreateQuizSchema = z.object({
  lessonId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(2000).default(''),
  passingScore: z
    .number()
    .int()
    .min(0, 'Passing score must be ≥ 0')
    .max(100, 'Passing score must be ≤ 100')
    .default(70),
  isRequired: z.boolean().default(true),
});

export type CreateQuizInput = z.infer<typeof CreateQuizSchema>;
