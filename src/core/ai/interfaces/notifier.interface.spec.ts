import { notifyToolSchema } from './notifier.interface';

const parsePhone = (phone: string): string => notifyToolSchema.parse({ name: 'Иван', phone }).phone;

describe('notifyToolSchema — phone normalisation', () => {
  it('keeps an already international number', () => {
    expect(parsePhone('+79251234567')).toBe('+79251234567');
  });

  it('turns a leading 8 into +7', () => {
    expect(parsePhone('89251234567')).toBe('+79251234567');
  });

  it('adds the +7 country code to a bare 10-digit number', () => {
    expect(parsePhone('9251234567')).toBe('+79251234567');
  });

  it('strips spaces, dashes and parentheses before normalising', () => {
    expect(parsePhone('8 (925) 123-45-67')).toBe('+79251234567');
    expect(parsePhone('+7 925 123 45 67')).toBe('+79251234567');
  });

  it('rejects a number that is too short to be a phone', () => {
    expect(() => parsePhone('123')).toThrow(/10-12/);
  });

  it('rejects a number that is too long', () => {
    expect(() => parsePhone('1234567890123456')).toThrow(/10-12/);
  });

  it('rejects a value with no digits at all', () => {
    expect(() => parsePhone('нет номера')).toThrow(/10-12/);
  });
});

describe('notifyToolSchema — remaining fields', () => {
  const base = { name: 'Иван', phone: '9251234567' };

  it('accepts a lead with only the required fields', () => {
    const parsed = notifyToolSchema.parse(base);

    expect(parsed.name).toBe('Иван');
    expect(parsed.age).toBeUndefined();
    expect(parsed.comment).toBeUndefined();
  });

  it('accepts an optional child age inside the allowed range', () => {
    expect(notifyToolSchema.parse({ ...base, age: 4 }).age).toBe(4);
    expect(notifyToolSchema.parse({ ...base, age: 18 }).age).toBe(18);
  });

  it('rejects a child age outside the allowed range', () => {
    expect(() => notifyToolSchema.parse({ ...base, age: 3 })).toThrow();
    expect(() => notifyToolSchema.parse({ ...base, age: 19 })).toThrow();
  });

  it('rejects a name shorter than two characters', () => {
    expect(() => notifyToolSchema.parse({ ...base, name: 'И' })).toThrow();
  });

  it('keeps an optional comment', () => {
    expect(notifyToolSchema.parse({ ...base, comment: 'перезвонить вечером' }).comment).toBe(
      'перезвонить вечером',
    );
  });
});
