import { TextParser } from './text.parser';

describe('TextParser', () => {
  const parser = new TextParser();

  it('decodes a UTF-8 buffer into text', async () => {
    const text = await parser.parse(Buffer.from('Привет, мир!', 'utf-8'));

    expect(text).toBe('Привет, мир!');
  });

  it('preserves line breaks and whitespace', async () => {
    const source = 'строка 1\n\n  строка 2  \n';
    const text = await parser.parse(Buffer.from(source, 'utf-8'));

    expect(text).toBe(source);
  });

  it('returns an empty string for an empty buffer', async () => {
    await expect(parser.parse(Buffer.alloc(0))).resolves.toBe('');
  });
});
