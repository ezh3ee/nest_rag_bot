import { z } from 'zod';

export const llmSchema = z.object({
  LLM_GENERATION_PROVIDER: z
    .enum(['openai', 'groq', 'polza', 'ollama', 'google'])
    .default('openai'),
  LLM_GENERATION_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  LLM_GENERATION_API_KEY: z.string().default(''),
  LLM_GENERATION_MODEL: z.string().default('gpt-4o-mini'),

  LLM_EMBEDDING_PROVIDER: z.enum(['openai', 'jina', 'ollama', 'google']).default('openai'),
  LLM_EMBEDDING_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  LLM_EMBEDDING_API_KEY: z.string().default(''),
  LLM_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIM: z.coerce.number().int().positive().default(1536),

  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  LLM_MAX_RETRIES: z.coerce.number().int().positive().default(3),
});

export const OpenAILikeSchema = z.object({
  provider: z.enum(['openai', 'groq', 'polza']),
  baseUrl: z.string().url(),
  apiKey: z.string(),
  model: z.string(),
});

export const OllamaSchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().url(),
  model: z.string(),
});

export const GoogleSchema = z.object({
  provider: z.literal('google'),
  apiKey: z.string(),
  model: z.string(),
});

export const EmbeddingOpenAILikeSchema = z.object({
  provider: z.enum(['openai', 'jina']),
  baseUrl: z.string().url(),
  apiKey: z.string(),
  model: z.string(),
});

export const EmbeddingOllamaSchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().url(),
  model: z.string(),
});

export const EmbeddingGoogleSchema = z.object({
  provider: z.literal('google'),
  apiKey: z.string(),
  model: z.string(),
});

export const GenerationProviderSchema = z.discriminatedUnion('provider', [
  OpenAILikeSchema,
  OllamaSchema,
  GoogleSchema,
]);

export const EmbeddingProviderSchema = z.discriminatedUnion('provider', [
  EmbeddingOpenAILikeSchema,
  EmbeddingOllamaSchema,
  EmbeddingGoogleSchema,
]);

export type EnvConfig = z.infer<typeof llmSchema>;
export type OpenAILikeConfig = z.infer<typeof OpenAILikeSchema>;
export type OllamaConfig = z.infer<typeof OllamaSchema>;
export type GoogleConfig = z.infer<typeof GoogleSchema>;
export type EmbeddingOpenAILikeConfig = z.infer<typeof EmbeddingOpenAILikeSchema>;
export type EmbeddingOllamaConfig = z.infer<typeof EmbeddingOllamaSchema>;
export type EmbeddingGoogleConfig = z.infer<typeof EmbeddingGoogleSchema>;
export type GenerationProviderConfig = z.infer<typeof GenerationProviderSchema>;
export type EmbeddingProviderConfig = z.infer<typeof EmbeddingProviderSchema>;
