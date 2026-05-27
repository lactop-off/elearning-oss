import { z } from 'zod';

export const UpdateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['LEARNER', 'INSTRUCTOR', 'ADMIN']),
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

export const SetUserDisabledSchema = z.object({
  userId: z.string().min(1),
  disabled: z.boolean(),
});
export type SetUserDisabledInput = z.infer<typeof SetUserDisabledSchema>;

export const CourseApprovalSchema = z.object({
  courseId: z.string().min(1),
});
export type CourseApprovalInput = z.infer<typeof CourseApprovalSchema>;
