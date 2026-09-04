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
import { IngestService } from '../../core/ingest/ingest.service';
import {
  buildConfirmDeleteKeyboard,
  buildDocDetailKeyboard,
  buildDocsListKeyboard,
  deletedText,
  docDetailText,
  docsListText,
  MAX_TG_MESSAGE,
  PAGE_SIZE,
  parseDocsCallback,
} from './telegram-docs.ui';
import { syncCommandMenus, syncGroupCommands } from './telegram-commands';

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
    await syncCommandMenus(this.bot, this.config.ADMIN_CHAT_ID);
    this.logger.log('Command menus synced');
    await this.bot.start({
      onStart: (me) => this.logger.log(`Bot started as @${me.username}`),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.bot.stop();
    this.logger.log('Bot stopped');
  }

  private registerHandlers(): void {
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        'Привет! Я бот, отвечаю на вопросы по базе знаний.\n' +
          'Просто задай вопрос — и я найду ответ в загруженных документах.',
      );
    });

    this.bot.command('learn', async (ctx) => {
      const usage =
        'Отправь мне документ (pdf, docx, txt, md) — я обучусь по нему. ' +
        'Управление документами: /docs';
      await ctx.reply(usage);
    });

    this.bot.command('docs', async (ctx) => {
      if (!this.isAdmin(ctx)) {
        await ctx.reply('⛔ Доступно только администратору.');
        return;
      }
      await this.renderDocsPage(ctx, 0, false);
    });

    this.bot.on('callback_query:data', async (ctx) => {
      const parsed = parseDocsCallback(ctx.callbackQuery.data);
      if (!parsed) {
        await ctx.answerCallbackQuery();
        return;
      }
      if (!this.isAdmin(ctx)) {
        await ctx.answerCallbackQuery('⛔ Только для администратора');
        return;
      }

      try {
        switch (parsed.action) {
          case 'page':
            await ctx.answerCallbackQuery();
            await this.renderDocsPage(ctx, parsed.offset, true);
            return;
          case 'view':
            await ctx.answerCallbackQuery();
            await this.showDocument(ctx, parsed.documentId, parsed.offset);
            return;
          case 'delete':
            await ctx.answerCallbackQuery();
            await this.showDeleteConfirmation(ctx, parsed.documentId, parsed.offset);
            return;
          case 'confirm':
            await ctx.answerCallbackQuery();
            await this.deleteDocument(ctx, parsed.documentId, parsed.offset);
            return;
        }
      } catch (error) {
        this.logger.error(
          `Callback error: ${error instanceof Error ? error.message : String(error)}`,
        );
        await ctx.answerCallbackQuery('Произошла ошибка');
      }
    });

    this.bot.on('message:document', async (ctx) => {
      if (!this.isAdmin(ctx)) {
        await ctx.reply('⛔ Обучение доступно только администратору.');
        return;
      }
      const doc = ctx.message.document;
      if (doc.file_size === undefined || doc.file_size > 20 * 1024 * 1024) {
        await ctx.reply(`Файл слишком большой (максимум 20 МБ).`);
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
        await ctx.reply('Неизвестная команда. Доступные команды — в меню (кнопка слева).');
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

    this.bot.on('my_chat_member', async (ctx) => {
      const chat = ctx.myChatMember.chat;
      if (chat.type === 'private') {
        return;
      }
      const status = ctx.myChatMember.new_chat_member.status;
      const botIsPresent = status === 'member' || status === 'administrator';
      try {
        await syncGroupCommands(this.bot, chat.id, this.config.ADMIN_CHAT_ID, botIsPresent);
        this.logger.log(`Group commands synced for chat ${chat.id} (present: ${botIsPresent})`);
      } catch (error) {
        this.logger.error(
          `Group sync failed for ${chat.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  private isAdmin(ctx: Context): boolean {
    return ctx.from?.id === this.config.ADMIN_CHAT_ID;
  }

  private async renderDocsPage(ctx: Context, page: number, edit: boolean): Promise<void> {
    const docs = await this.ingest.getDocumentsPage(page + 1, PAGE_SIZE);
    const text = docsListText(docs);
    const keyboard = buildDocsListKeyboard(docs, (p) => (p - 1) * PAGE_SIZE);

    if (edit) {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } else {
      await ctx.reply(text, { reply_markup: keyboard });
    }
  }

  private async showDocument(ctx: Context, documentId: string, backOffset: number): Promise<void> {
    const doc = await this.ingest.getDocument(documentId);
    if (!doc) {
      await ctx.editMessageText('Документ уже удалён.', {
        reply_markup: undefined,
      });
      return;
    }
    await ctx.editMessageText(docDetailText(doc), {
      reply_markup: buildDocDetailKeyboard(documentId, backOffset),
    });
  }

  private async showDeleteConfirmation(
    ctx: Context,
    documentId: string,
    backOffset: number,
  ): Promise<void> {
    const doc = await this.ingest.getDocument(documentId);
    if (!doc) {
      await ctx.editMessageText('Документ уже удалён.', {
        reply_markup: undefined,
      });
      return;
    }
    await ctx.editMessageText(`Удалить «${doc.fileName}»?`, {
      reply_markup: buildConfirmDeleteKeyboard(documentId, backOffset),
    });
  }

  private async deleteDocument(
    ctx: Context,
    documentId: string,
    backOffset: number,
  ): Promise<void> {
    const doc = await this.ingest.getDocument(documentId);
    if (!doc) {
      await ctx.editMessageText('Документ уже удалён.');
      return;
    }

    await this.ingest.deleteDocument(documentId);

    const page = Math.floor(backOffset / PAGE_SIZE) + 1;
    const docs = await this.ingest.getDocumentsPage(page, PAGE_SIZE);
    if (docs.total === 0) {
      await ctx.editMessageText(docsListText(docs));
      return;
    }
    await ctx.editMessageText(`${deletedText(doc.fileName)}\n\n${docsListText(docs)}`, {
      reply_markup: buildDocsListKeyboard(docs, (p) => (p - 1) * PAGE_SIZE),
    });
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
