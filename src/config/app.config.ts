import { registerAs } from '@nestjs/config';
import { ZodError } from 'zod';
import { EmbeddingProviderSchema, envSchema, GenerationProviderSchema } from './app.schema';
import type { EmbeddingProviderConfig, EnvConfig, GenerationProviderConfig } from './app.schema';
import { formatZodIssues } from './validation/format-zod-error';

function toGenerationProviderConfig(env: EnvConfig): GenerationProviderConfig {
  const result = GenerationProviderSchema.safeParse({
    provider: env.LLM_GENERATION_PROVIDER,
    baseUrl: env.LLM_GENERATION_BASE_URL,
    apiKey: env.LLM_GENERATION_API_KEY,
    model: env.LLM_GENERATION_MODEL,
  });
  if (!result.success) {
    throw new Error(
      `[APP Config]: Invalid generation provider config - ${formatZodIssues(result.error)}`,
    );
  }
  return result.data;
}

function toEmbeddingProviderConfig(env: EnvConfig): EmbeddingProviderConfig {
  const result = EmbeddingProviderSchema.safeParse({
    provider: env.LLM_EMBEDDING_PROVIDER,
    baseUrl: env.LLM_EMBEDDING_BASE_URL,
    apiKey: env.LLM_EMBEDDING_API_KEY,
    model: env.LLM_EMBEDDING_MODEL,
  });
  if (!result.success) {
    throw new Error(
      `[APP Config]: Invalid embedding provider config - ${formatZodIssues(result.error)}`,
    );
  }
  return result.data;
}

export type AppConfig = EnvConfig & {
  generation: GenerationProviderConfig;
  embedding: EmbeddingProviderConfig;
};

export default registerAs('app', (): AppConfig => {
  let env: EnvConfig;

  try {
    env = envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`[APP Config]: Validation failed - ${formatZodIssues(error)}`, {
        cause: error,
      });
    }
    throw error;
  }

  return {
    ...env,
    generation: toGenerationProviderConfig(env),
    embedding: toEmbeddingProviderConfig(env),
  };
});
