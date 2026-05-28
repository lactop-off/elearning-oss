import { z } from 'zod';

// Reasonable ceilings: 4 hours for a time limit, 50 attempts ought to be
// enough. Floors are nominal so the UI doesn't accept obvious typos like
// "1 second" or "0 attempts".
const TimeLimitSec = z
  .number()
  .int()
  .min(30, 'Time limit must be at least 30 seconds')
  .max(14400, 'Time limit must be at most 4 hours')
  .nullable()
  .default(null);

const MaxAttempts = z
  .number()
  .int()
  .min(1, 'Max attempts must be at least 1')
  .max(50, 'Max attempts must be at most 50')
  .nullable()
  .default(null);

const ShuffleChoices = z.boolean().default(false);

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
  timeLimitSec: TimeLimitSec,
  maxAttempts: MaxAttempts,
  shuffleChoices: ShuffleChoices,
});

export type CreateQuizInput = z.infer<typeof CreateQuizSchema>;

export const UpdateQuizSchema = z.object({
  quizId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(2000).default(''),
  passingScore: z
    .number()
    .int()
    .min(0, 'Passing score must be ≥ 0')
    .max(100, 'Passing score must be ≤ 100')
    .default(70),
  isRequired: z.boolean().default(true),
  timeLimitSec: TimeLimitSec,
  maxAttempts: MaxAttempts,
  shuffleChoices: ShuffleChoices,
});

export type UpdateQuizInput = z.infer<typeof UpdateQuizSchema>;
