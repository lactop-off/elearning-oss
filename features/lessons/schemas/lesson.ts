import { z } from 'zod';

export const CreateLessonSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().max(20000, 'Content is too long').default(''),
  isRequired: z.boolean().default(true),
});

export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;

export const UpdateLessonSchema = z.object({
  lessonId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().max(20000, 'Content is too long').default(''),
  isRequired: z.boolean().default(true),
});

export type UpdateLessonInput = z.infer<typeof UpdateLessonSchema>;

export const ReorderLessonsSchema = z
  .object({
    courseId: z.string().min(1),
    orderedLessonIds: z
      .array(z.string().min(1))
      .min(1, 'Cannot reorder an empty list')
      .max(500, 'Too many lessons'),
  })
  .refine(
    (data) => new Set(data.orderedLessonIds).size === data.orderedLessonIds.length,
    { message: 'Duplicate lessonId in reorder request', path: ['orderedLessonIds'] },
  );

export type ReorderLessonsInput = z.infer<typeof ReorderLessonsSchema>;
