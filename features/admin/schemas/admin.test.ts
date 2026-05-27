import { describe, expect, it } from 'vitest';
import { CourseApprovalSchema, SetUserDisabledSchema, UpdateUserRoleSchema } from './admin';

describe('UpdateUserRoleSchema', () => {
  it('accepts role LEARNER', () => {
    const result = UpdateUserRoleSchema.safeParse({ userId: 'user-1', role: 'LEARNER' });
    expect(result.success).toBe(true);
  });

  it('accepts role INSTRUCTOR', () => {
    const result = UpdateUserRoleSchema.safeParse({ userId: 'user-1', role: 'INSTRUCTOR' });
    expect(result.success).toBe(true);
  });

  it('accepts role ADMIN', () => {
    const result = UpdateUserRoleSchema.safeParse({ userId: 'user-1', role: 'ADMIN' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown role string', () => {
    const result = UpdateUserRoleSchema.safeParse({ userId: 'user-1', role: 'SUPERUSER' });
    expect(result.success).toBe(false);
  });

  it('rejects a lowercase role string', () => {
    const result = UpdateUserRoleSchema.safeParse({ userId: 'user-1', role: 'learner' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty userId', () => {
    const result = UpdateUserRoleSchema.safeParse({ userId: '', role: 'LEARNER' });
    expect(result.success).toBe(false);
  });

  it('rejects when role is missing', () => {
    const result = UpdateUserRoleSchema.safeParse({ userId: 'user-1' });
    expect(result.success).toBe(false);
  });

  it('rejects when userId is missing', () => {
    const result = UpdateUserRoleSchema.safeParse({ role: 'ADMIN' });
    expect(result.success).toBe(false);
  });
});

describe('SetUserDisabledSchema', () => {
  it('accepts disabled: true', () => {
    const result = SetUserDisabledSchema.safeParse({ userId: 'user-1', disabled: true });
    expect(result.success).toBe(true);
  });

  it('accepts disabled: false', () => {
    const result = SetUserDisabledSchema.safeParse({ userId: 'user-1', disabled: false });
    expect(result.success).toBe(true);
  });

  it('rejects disabled as a string "true"', () => {
    const result = SetUserDisabledSchema.safeParse({ userId: 'user-1', disabled: 'true' });
    expect(result.success).toBe(false);
  });

  it('rejects disabled as a number 1', () => {
    const result = SetUserDisabledSchema.safeParse({ userId: 'user-1', disabled: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects disabled as null', () => {
    const result = SetUserDisabledSchema.safeParse({ userId: 'user-1', disabled: null });
    expect(result.success).toBe(false);
  });

  it('rejects an empty userId', () => {
    const result = SetUserDisabledSchema.safeParse({ userId: '', disabled: true });
    expect(result.success).toBe(false);
  });

  it('rejects when disabled is missing', () => {
    const result = SetUserDisabledSchema.safeParse({ userId: 'user-1' });
    expect(result.success).toBe(false);
  });
});

describe('CourseApprovalSchema', () => {
  it('accepts a valid courseId', () => {
    const result = CourseApprovalSchema.safeParse({ courseId: 'course-abc' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty courseId', () => {
    const result = CourseApprovalSchema.safeParse({ courseId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects when courseId is missing', () => {
    const result = CourseApprovalSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects when courseId is null', () => {
    const result = CourseApprovalSchema.safeParse({ courseId: null });
    expect(result.success).toBe(false);
  });
});
