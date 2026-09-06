import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Bot, Context, Filter } from 'grammy';
import { GrammyError } from 'grammy';
import appConfig from '../../config/app.config';
import { IngestService } from '../../core/ingest/ingest.service';
import {
  Action,
  buildConfirmDeleteAllKeyboard,
  buildConfirmDeleteKeyboard,
  buildDocDetailKeyboard,
  buildDocsListKeyboard,
  deletedText,
  docDetailText,
  docsListText,
  PAGE_SIZE,
  parseDocsCallback,
} from './telegram-docs.ui';
import { isAdmin } from './telegram-guards';

type CallbackQueryContext = Filter<Context, 'callback_query:data'>;

@Injectable()
export class DocsHandler {
  private readonly logger = new Logger(DocsHandler.name);

  constructor(
    private readonly ingest: IngestService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  register(bot: Bot): void {
    bot.command('docs', async (ctx) => {
      await this.onDocsCommand(ctx);
    });

    bot.on('callback_query:data', async (ctx) => {
      await this.onCallbackQuery(ctx);
    });
  }

  private async onDocsCommand(ctx: Context): Promise<void> {
    if (!isAdmin(ctx, this.config.ADMIN_CHAT_ID)) {
      await ctx.reply('⛔ Доступно только администратору.');
      return;
    }
    await this.renderDocsPage(ctx, 0, false);
  }

  private async onCallbackQuery(ctx: CallbackQueryContext): Promise<void> {
    const parsed = parseDocsCallback(ctx.callbackQuery.data);
    if (!parsed) {
      await ctx.answerCallbackQuery();
      return;
    }
    if (!isAdmin(ctx, this.config.ADMIN_CHAT_ID)) {
      await ctx.answerCallbackQuery('⛔ Только для администратора');
      return;
    }

    const page = Number(parsed.page);

    try {
      switch (parsed.action) {
        case Action.PAGE:
          await ctx.answerCallbackQuery();
          await this.renderDocsPage(ctx, page, true);
          return;
        case Action.VIEW:
          await ctx.answerCallbackQuery();
          await this.showDocument(ctx, parsed.documentId, page);
          return;
        case Action.DELETE:
          await ctx.answerCallbackQuery();
          await this.showDeleteConfirmation(ctx, parsed.documentId, page);
          return;
        case Action.CONFIRM:
          await ctx.answerCallbackQuery();
          await this.deleteDocument(ctx, parsed.documentId, page);
          return;
        case Action.DELETE_ALL:
          await ctx.answerCallbackQuery();
          await this.showDeleteAllConfirmation(ctx, page);
          return;
        case Action.CONFIRM_ALL:
          console.log('CONFIRM_ALL in switch');
          await ctx.answerCallbackQuery();
          await this.deleteAllDocuments(ctx);
          return;
      }
    } catch (error) {
      if (error instanceof GrammyError && error.description.includes('message is not modified')) {
        await ctx.answerCallbackQuery();
        return;
      }
      this.logger.error(
        `Callback error: ${error instanceof Error ? error.message : String(error)}`,
      );
      await ctx.answerCallbackQuery('Произошла ошибка');
    }
  }

  private async renderDocsPage(ctx: Context, page: number, edit: boolean): Promise<void> {
    const docs = await this.ingest.getDocumentsPage(page + 1, PAGE_SIZE);
    const text = docsListText(docs);
    const keyboard = buildDocsListKeyboard(docs, (p) => p - 1);

    if (edit) {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } else {
      await ctx.reply(text, { reply_markup: keyboard });
    }
  }

  private async showDocument(ctx: Context, documentId: string, backPage: number): Promise<void> {
    const doc = await this.ingest.getDocument(documentId);
    if (!doc) {
      await ctx.editMessageText('Документ уже удалён.', {
        reply_markup: undefined,
      });
      return;
    }
    await ctx.editMessageText(docDetailText(doc), {
      reply_markup: buildDocDetailKeyboard(documentId, backPage),
    });
  }

  private async showDeleteConfirmation(
    ctx: Context,
    documentId: string,
    backPage: number,
  ): Promise<void> {
    const doc = await this.ingest.getDocument(documentId);
    if (!doc) {
      await ctx.editMessageText('Документ уже удалён.', {
        reply_markup: undefined,
      });
      return;
    }
    await ctx.editMessageText(`Удалить «${doc.fileName}»?`, {
      reply_markup: buildConfirmDeleteKeyboard(documentId, backPage),
    });
  }

  private async showDeleteAllConfirmation(ctx: Context, backPage: number): Promise<void> {
    await ctx.editMessageText(
      `⚠️ВНИМАНИЕ! Данное действие удалит все документы из базы данных.\n\nУдалить все документы?`,
      {
        reply_markup: buildConfirmDeleteAllKeyboard(backPage),
      },
    );
  }

  private async deleteDocument(ctx: Context, documentId: string, backPage: number): Promise<void> {
    const doc = await this.ingest.getDocument(documentId);
    if (!doc) {
      await ctx.editMessageText('Документ уже удалён.');
      return;
    }

    await this.ingest.deleteDocument(documentId);

    const page = backPage + 1;
    const docs = await this.ingest.getDocumentsPage(page, PAGE_SIZE);
    if (docs.total === 0) {
      await ctx.editMessageText(docsListText(docs));
      return;
    }
    await ctx.editMessageText(`${deletedText(doc.fileName)}\n\n${docsListText(docs)}`, {
      reply_markup: buildDocsListKeyboard(docs, (p) => p - 1),
    });
  }

  private async deleteAllDocuments(ctx: Context): Promise<void> {
    await this.ingest.deleteAll();
    await ctx.editMessageText('Все документы удалены.');
  }
}
