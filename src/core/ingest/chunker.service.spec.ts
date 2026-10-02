import { ChunkerService } from './chunker.service';

describe('ChunkerService', () => {
  const service = new ChunkerService();

  it('returns a single chunk with index 0 for short text', async () => {
    const chunks = await service.chunk('короткий текст');

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({ index: 0, text: 'короткий текст' });
  });

  it('numbers chunks sequentially starting from 0', async () => {
    const text = Array.from({ length: 200 }, (_, i) => `строка номер ${i}`).join('\n');
    const chunks = await service.chunk(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
  });

  it('keeps every chunk within the configured size limit', async () => {
    const text = 'а'.repeat(5000);
    const chunks = await service.chunk(text);

    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(500);
    }
  });

  it('does not invent content: every chunk is a slice of the original text', async () => {
    const text = 'слово '.repeat(400);
    const chunks = await service.chunk(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(text).toContain(chunk.text.trim());
    }
  });
});
