import { z } from 'zod';

export const MarkCompleteSchema = z.object({
  enrollmentId: z.string().min(1),
  lessonId: z.string().min(1),
});

export type MarkCompleteInput = z.infer<typeof MarkCompleteSchema>;
