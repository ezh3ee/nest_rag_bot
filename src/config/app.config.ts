import { registerAs } from '@nestjs/config';
import { z, ZodError } from 'zod';
import { formatZodIssues } from './validation/format-zod-error';

const strictBool = z
  .string()
  .default('false')
  .refine((val) => val === 'true' || val === 'false', {
    message: "Must be strictly 'true' or 'false'",
  })
  .transform((val) => val === 'true');

const appConfigSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),

    TELEGRAM_BOT_TOKEN: z.string().min(1),
    ADMIN_CHAT_ID: z.coerce.number().int().positive(),

    QDRANT_URL: z.string().url().default('http://localhost:6333'),
    QDRANT_API_KEY: z.string().min(1).default(''),
    QDRANT_COLLECTION: z.string().min(1).default('rag_minimal'),

    DATABASE_URL: z.string().default('file:./dev.db'),
    CHAT_LOG_DIR: z.string().min(1).default('./logs'),

    USE_WIDGET: strictBool,
    WIDGET_TOKEN: z.string().default(''),
    WIDGET_ALLOWED_ORIGIN: z.union([z.literal(''), z.string().url()]).default(''),
    WIDGET_DAILY_LIMIT: z.coerce.number().int().positive().default(200),
  })
  .refine((cfg) => !cfg.USE_WIDGET || cfg.WIDGET_TOKEN.length > 0, {
    message: 'USE_WIDGET=true requires a non-empty WIDGET_TOKEN',
    path: ['WIDGET_TOKEN'],
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
