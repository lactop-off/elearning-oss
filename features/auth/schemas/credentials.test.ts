import { describe, expect, it } from 'vitest';
import { SignInSchema, SignUpSchema } from './credentials';

describe('SignInSchema', () => {
  it('accepts a valid email/password', () => {
    expect(SignInSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = SignInSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('requires a password', () => {
    const result = SignInSchema.safeParse({ email: 'a@b.co', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('SignUpSchema', () => {
  it('accepts valid input', () => {
    const result = SignUpSchema.safeParse({
      email: 'a@b.co',
      name: 'Alice',
      password: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = SignUpSchema.safeParse({
      email: 'a@b.co',
      name: 'Alice',
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const result = SignUpSchema.safeParse({
      email: 'a@b.co',
      name: '',
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name longer than 100 characters', () => {
    const result = SignUpSchema.safeParse({
      email: 'a@b.co',
      name: 'x'.repeat(101),
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });
});
