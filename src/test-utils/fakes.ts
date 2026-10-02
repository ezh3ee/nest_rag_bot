import type { ConfigType } from '@nestjs/config';
import type { Bot } from 'grammy';
import appConfig from '../config/app.config';

export type AppConfigValues = ConfigType<typeof appConfig>;

/** Полный валидный конфиг с точечными переопределениями. */
export function appConfigFake(overrides: Partial<AppConfigValues> = {}): AppConfigValues {
  return {
    PORT: 3000,
    TELEGRAM_BOT_TOKEN: 'test-token',
    ADMIN_CHAT_ID: 111,
    QDRANT_URL: 'http://localhost:6333',
    QDRANT_API_KEY: '',
    QDRANT_COLLECTION: 'rag_minimal',
    REDIS_HOST: 'localhost',
    DATABASE_URL: 'file:./dev.db',
    CHAT_LOG_DIR: './logs',
    USE_WIDGET: false,
    WIDGET_TOKEN: '',
    WIDGET_ALLOWED_ORIGIN: '',
    WIDGET_DAILY_LIMIT: 200,
    ...overrides,
  };
}

type AnyHandler = (ctx: never) => unknown;

export interface BotRecorder {
  bot: Bot;
  runCommand(name: string, ctx: unknown): Promise<unknown>;
  runMessage(kind: string, ctx: unknown): Promise<unknown>;
}

/**
 * Подменяет grammY-бота: перехватывает обработчики, которые регистрирует хендлер,
 * чтобы вызывать их напрямую из теста.
 */
export function botRecorder(): BotRecorder {
  const commands = new Map<string, AnyHandler>();
  const listeners = new Map<string, AnyHandler>();

  const bot = {
    command(name: string, handler: AnyHandler): void {
      commands.set(name, handler);
    },
    on(kind: string, handler: AnyHandler): void {
      listeners.set(kind, handler);
    },
  } as unknown as Bot;

  const pick = (map: Map<string, AnyHandler>, key: string): AnyHandler => {
    const handler = map.get(key);
    if (!handler) {
      throw new Error(`Обработчик "${key}" не зарегистрирован`);
    }
    return handler;
  };

  return {
    bot,
    runCommand: async (name, ctx) => pick(commands, name)(ctx as never),
    runMessage: async (kind, ctx) => pick(listeners, kind)(ctx as never),
  };
}

export interface DocumentStub {
  file_name?: string;
  file_id?: string;
  file_size?: number;
}

export interface ContextStubOptions {
  chatId?: number;
  fromId?: number;
  text?: string;
  document?: DocumentStub;
  filePath?: string;
  /** Заставить editMessageText падать на сообщениях, подходящих под предикат. */
  failEditOn?: (text: string) => boolean;
}

export interface ContextStub {
  ctx: unknown;
  replies: string[];
  edits: string[];
  chatActions: string[];
}

/** Минимальный фейк grammY-контекста, собирающий то, что бот отправил. */
export function contextStub(options: ContextStubOptions = {}): ContextStub {
  const replies: string[] = [];
  const edits: string[] = [];
  const chatActions: string[] = [];

  const ctx = {
    chat: { id: options.chatId ?? 1 },
    from: { id: options.fromId ?? 111 },
    message: {
      text: options.text ?? '',
      document: options.document,
    },
    reply: async (text: string) => {
      replies.push(text);
      return { message_id: 1 };
    },
    replyWithChatAction: async (action: string) => {
      chatActions.push(action);
    },
    api: {
      editMessageText: async (_chatId: number, _messageId: number, text: string) => {
        if (options.failEditOn?.(text)) {
          throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
        }
        edits.push(text);
      },
    },
    getFile: async () => ({ file_path: options.filePath ?? 'documents/file.txt' }),
  };

  return { ctx, replies, edits, chatActions };
}
