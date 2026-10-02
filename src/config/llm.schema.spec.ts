import { EmbeddingProviderSchema, GenerationProviderSchema, llmSchema } from './llm.schema';

describe('llmSchema (environment)', () => {
  it('applies defaults for an empty environment', () => {
    const config = llmSchema.parse({});

    expect(config.LLM_GENERATION_PROVIDER).toBe('openai');
    expect(config.LLM_GENERATION_MODEL).toBe('gpt-4o-mini');
    expect(config.LLM_EMBEDDING_MODEL).toBe('text-embedding-3-small');
    expect(config.EMBEDDING_DIM).toBe(1536);
    expect(config.LLM_TIMEOUT_MS).toBe(30000);
    expect(config.LLM_MAX_RETRIES).toBe(3);
  });

  it('coerces numeric strings', () => {
    const config = llmSchema.parse({ EMBEDDING_DIM: '1024', LLM_MAX_RETRIES: '5' });

    expect(config.EMBEDDING_DIM).toBe(1024);
    expect(config.LLM_MAX_RETRIES).toBe(5);
  });

  it('rejects an unknown generation provider', () => {
    expect(() => llmSchema.parse({ LLM_GENERATION_PROVIDER: 'anthropic' })).toThrow();
  });

  it('rejects an unknown embedding provider', () => {
    expect(() => llmSchema.parse({ LLM_EMBEDDING_PROVIDER: 'cohere' })).toThrow();
  });

  it('rejects a non-URL base url', () => {
    expect(() => llmSchema.parse({ LLM_GENERATION_BASE_URL: 'not a url' })).toThrow();
  });
});

describe('GenerationProviderSchema', () => {
  it('accepts an openai-like provider with a base url', () => {
    const parsed = GenerationProviderSchema.parse({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'key',
      model: 'gpt-4o-mini',
    });

    expect(parsed.provider).toBe('openai');
  });

  it('accepts ollama without an api key', () => {
    const parsed = GenerationProviderSchema.parse({
      provider: 'ollama',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
    });

    expect(parsed.provider).toBe('ollama');
  });

  it('accepts google with an api key', () => {
    const parsed = GenerationProviderSchema.parse({
      provider: 'google',
      apiKey: 'key',
      model: 'gemini-2.0-flash',
    });

    expect(parsed.provider).toBe('google');
  });

  it('rejects an unsupported provider name', () => {
    expect(() =>
      GenerationProviderSchema.parse({ provider: 'anthropic', apiKey: 'key', model: 'claude' }),
    ).toThrow();
  });
});

describe('EmbeddingProviderSchema', () => {
  it('accepts jina with a base url', () => {
    const parsed = EmbeddingProviderSchema.parse({
      provider: 'jina',
      baseUrl: 'https://api.jina.ai/v1',
      apiKey: 'key',
      model: 'jina-embeddings-v3',
    });

    expect(parsed.provider).toBe('jina');
  });

  it('rejects google embeddings without an api key field', () => {
    expect(() =>
      EmbeddingProviderSchema.parse({ provider: 'google', model: 'text-embedding-004' }),
    ).toThrow();
  });
});
