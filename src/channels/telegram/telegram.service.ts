import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Bot, type Context } from 'grammy';
import appConfig from '../../config/app.config';
import { ChatService } from '../../core/chat.service';
import { DocumentNotFoundError } from '../../core/ingest/errors';
import { IngestService } from '../../core/ingest/ingest.service';

const MAX_TG_MESSAGE = 4000;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bot: Bot;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    private readonly chat: ChatService,
    private readonly ingest: IngestService,
  ) {
    this.bot = new Bot(config.TELEGRAM_BOT_TOKEN);
    this.registerHandlers();
  }

  async onApplicationBootstrap(): Promise<void> {
    this.bot.catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bot error: ${message}`);
    });
    await this.bot.start({
      onStart: (me) => this.logger.log(`Bot started as @${me.username}`),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.bot.stop();
    this.logger.log('Bot stopped');
  }

  private registerHandlers(): void {
    this.bot.command('learn', async (ctx) => {
      const usage =
        'Отправь мне документ (pdf, docx, txt, md) — я обучусь по нему. ' +
        'Или просто задай вопрос, и я отвечу по загруженным документам.';
      await ctx.reply(usage);
    });

    this.bot.command('docs', async (ctx) => {
      const docs = await this.ingest.listDocuments();
      if (docs.length === 0) {
        await ctx.reply('Документов пока нет. Отправь файл для обучения.');
        return;
      }
      const lines = docs.map((d) => {
        const icon = d.status === 'done' ? '✅' : d.status === 'error' ? '❌' : '⏳';
        const err = d.errorMessage ? ` — ${d.errorMessage}` : '';
        return `${icon} ${d.fileName} (${d.chunkCount} чанков)${err} , id - ${d.id}`;
      });
      await ctx.reply(['Документы в базе:', ...lines].join('\n'));
    });

    this.bot.command('delete', async (ctx) => {
      if (!this.isAdmin(ctx)) {
        await ctx.reply('⛔ Удаление документов доступно только администратору.');
        return;
      }

      const args = ctx.message?.text.split(' ').slice(1);
      if (!args || args.length !== 1) {
        await ctx.reply(
          '⛔ Неправильный формат команды. Используй /delete <id> , чтобы удалить документ',
        );
        return;
      }

      const id = args[0];

      try {
        await this.ingest.deleteDocument(id);
        await ctx.reply(`✅ Документ удалён, id - ${id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof DocumentNotFoundError) {
          await ctx.reply(`❌ Документ с таким ID  не найден, id - ${id}`);
          return;
        }

        await ctx.reply(`❌ Ошибка удаления документа: ${message}`);
      }
    });

    this.bot.on('message:document', async (ctx) => {
      if (!this.isAdmin(ctx)) {
        await ctx.reply('⛔ Обучение доступно только администратору.');
        return;
      }
      const doc = ctx.message.document;
      if (doc.file_size === undefined || doc.file_size > MAX_FILE_BYTES) {
        await ctx.reply(`Файл слишком большой (максимум ${MAX_FILE_BYTES / 1024 / 1024} МБ).`);
        return;
      }
      const fileName = doc.file_name ?? `document-${doc.file_id}`;
      const status = await ctx.reply(`⏳ Обрабатываю ${fileName}...`);

      try {
        const file = await ctx.getFile();
        const buffer = await this.downloadFile(file.file_path);
        const result = await this.ingest.ingest(fileName, buffer);
        await ctx.api.editMessageText(
          ctx.chat.id,
          status.message_id,
          `✅ ${fileName}: ${result.document.chunkCount} чанков добавлено.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.api.editMessageText(ctx.chat.id, status.message_id, `❌ Ошибка: ${message}`);
      }
    });

    this.bot.on('message:text', async (ctx) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) {
        await ctx.reply('Неизвестная команда. Доступно: /learn, /docs, /delete');
        return;
      }
      try {
        const reply = await this.chat.handleUserMessage(text);
        await ctx.reply(reply.answer.slice(0, MAX_TG_MESSAGE));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Chat error: ${message}`);
        await ctx.reply('Произошла ошибка при обработке вопроса. Попробуй ещё раз.');
      }
    });
  }

  private isAdmin(ctx: Context): boolean {
    return ctx.from?.id === this.config.ADMIN_CHAT_ID;
  }

  private async downloadFile(filePath: string | undefined): Promise<Buffer> {
    if (!filePath) {
      throw new Error('Telegram did not return a file path');
    }
    const url = `https://api.telegram.org/file/bot${this.config.TELEGRAM_BOT_TOKEN}/${filePath}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`File download failed: HTTP ${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    return Buffer.from(bytes);
  }
}
