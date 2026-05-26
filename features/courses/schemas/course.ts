import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';

export const CreateCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug is too long')
    .regex(SLUG_PATTERN, 'Slug must be lowercase letters, digits, and dashes'),
  description: z.string().max(2000, 'Description is too long').default(''),
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
