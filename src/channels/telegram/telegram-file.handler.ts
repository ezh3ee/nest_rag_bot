import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Bot, Context, Filter } from 'grammy';
import { z } from 'zod';
import appConfig from '../../config/app.config';
import { IngestService, isSupportedFileName } from '../../core/ingest/ingest.service';
import { downloadTelegramFile } from './telegram-files';
import { isAdmin } from './telegram-guards';

type DocumentContext = Filter<Context, 'message:document'>;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_MB = 20;
const PARSE_FILE_RETRIES = 5;

const networkCauseSchema = z.object({
  code: z.enum([
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
    'UND_ERR_HEADERS_TIMEOUT',
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
  ]),
});

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && networkCauseSchema.safeParse(error.cause).success;
}

@Injectable()
export class FileHandler {
  private readonly logger = new Logger(FileHandler.name);

  constructor(
    private readonly ingest: IngestService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  register(bot: Bot): void {
    bot.command('learn', async (ctx) => {
      const usage =
        'Отправь мне документ (pdf, docx, txt, md, xlsx) — я обучусь по нему. ' +
        'Управление документами: /docs';
      await ctx.reply(usage);
    });

    bot.on('message:document', async (ctx) => {
      await this.onDocument(ctx);
    });
  }

  private async onDocument(ctx: DocumentContext): Promise<void> {
    if (!isAdmin(ctx, this.config.ADMIN_CHAT_ID)) {
      await ctx.reply('⛔ Обучение доступно только администратору.');
      return;
    }

    const doc = ctx.message.document;

    if (doc.file_size === undefined || doc.file_size > MAX_FILE_BYTES) {
      await ctx.reply(`Файл слишком большой (максимум ${MAX_FILE_MB} МБ).`);
      return;
    }

    const fileName = doc.file_name ?? `document-${doc.file_id}`;

    if (!isSupportedFileName(fileName)) {
      await ctx.reply('⛔ Формат не поддерживается. Пришли файл: pdf, docx, txt, md, xlsx');
      return;
    }

    const status = await ctx.reply(`⏳ Обрабатываю ${fileName}...`);

    let currentTry = 0;
    while (currentTry <= PARSE_FILE_RETRIES) {
      try {
        if (currentTry) {
          await ctx.api.editMessageText(
            ctx.chat.id,
            status.message_id,
            `⏳ Попытка ${currentTry}. Обрабатываю ${fileName}...`,
          );
        }

        const file = await ctx.getFile();
        const buffer = await downloadTelegramFile(this.config.TELEGRAM_BOT_TOKEN, file.file_path);
        const result = await this.ingest.ingest(fileName, buffer);
        await ctx.api.editMessageText(
          ctx.chat.id,
          status.message_id,
          `✅ ${fileName}: ${result.document.chunkCount} чанков добавлено.`,
        );

        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!isNetworkError(error) || currentTry >= PARSE_FILE_RETRIES) {
          await ctx.api.editMessageText(
            ctx.chat.id,
            status.message_id,
            `❌ Ошибка загрузки файла: ${message}.`,
          );

          this.logger.error(`Ingest failed for "${fileName}": ${message}`, error);

          return;
        }

        this.logger.warn(
          `Network error on ingest try ${currentTry} for "${fileName}": ${message}. Retrying...`,
        );

        currentTry++;
      }
    }
  }
}
