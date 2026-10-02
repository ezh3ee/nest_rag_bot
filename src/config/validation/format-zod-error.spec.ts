import { z } from 'zod';
import { formatZodIssues } from './format-zod-error';

describe('formatZodIssues', () => {
  it('renders "path: message" for a single issue', () => {
    const schema = z.object({ port: z.string() });
    const result = schema.safeParse({ port: 3000 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(formatZodIssues(result.error)).toContain('port:');
  });

  it('joins several issues with "; "', () => {
    const schema = z.object({ a: z.string(), b: z.string() });
    const result = schema.safeParse({ a: 1, b: 2 });

    expect(result.success).toBe(false);
    if (result.success) return;

    const formatted = formatZodIssues(result.error);
    expect(formatted.split('; ')).toHaveLength(2);
    expect(formatted).toContain('a:');
    expect(formatted).toContain('b:');
  });

  it('renders "(root)" for issues without a path', () => {
    const schema = z.string();
    const result = schema.safeParse(42);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(formatZodIssues(result.error)).toBe('(root): Expected string, received number');
  });
});
