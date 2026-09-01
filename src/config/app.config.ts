import { registerAs } from '@nestjs/config';
import { z, ZodError } from 'zod';
import { formatZodIssues } from './validation/format-zod-error';

const configSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  ADMIN_CHAT_ID: z.coerce.number().int().positive(),

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

  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_COLLECTION: z.string().min(1).default('rag_minimal'),

  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  LLM_MAX_RETRIES: z.coerce.number().int().positive().default(3),
});

export type AppConfig = z.infer<typeof configSchema>;

export default registerAs('app', (): AppConfig => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`[APP Config]: Validation failed - ${formatZodIssues(error)}`, {
        cause: error,
      });
    }
    throw error;
  }
});
