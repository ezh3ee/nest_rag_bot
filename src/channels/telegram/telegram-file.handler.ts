import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Bot, Context, Filter } from 'grammy';
import appConfig from '../../config/app.config';
import { IngestService } from '../../core/ingest/ingest.service';
import { downloadTelegramFile } from './telegram-files';
import { isAdmin } from './telegram-guards';

type DocumentContext = Filter<Context, 'message:document'>;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_MB = 20;
const PARSE_FILE_RETRIES = 5;

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
        'Отправь мне документ (pdf, docx, txt, md) — я обучусь по нему. ' +
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
        this.logger.error(`Ingest failed for "${fileName}": ${message}`, error);

        if (currentTry === PARSE_FILE_RETRIES) {
          await ctx.api.editMessageText(
            ctx.chat.id,
            status.message_id,
            `❌ Ошибка загрузки файла: ${message}.`,
          );

          return;
        }

        currentTry++;
      }
    }
  }
}
