import { z } from 'zod';

export const EnrollSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
});

export type EnrollInput = z.infer<typeof EnrollSchema>;
