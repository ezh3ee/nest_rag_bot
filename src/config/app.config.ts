import { registerAs } from '@nestjs/config';
import { z, ZodError } from 'zod';
import { formatZodIssues } from './validation/format-zod-error';

const appConfigSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  ADMIN_CHAT_ID: z.coerce.number().int().positive(),

  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_COLLECTION: z.string().min(1).default('rag_minimal'),

  DATABASE_URL: z.string().default('file:./dev.db'),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export default registerAs('app', (): AppConfig => {
  let data: AppConfig;

  try {
    data = appConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`[APP Config]: Validation failed - ${formatZodIssues(error)}`, {
        cause: error,
      });
    }

    throw error;
  }

  return data;
});
