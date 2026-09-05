import { Injectable, Logger } from '@nestjs/common';
import type { Bot, Context, Filter } from 'grammy';
import { ChatService } from '../../core/chat.service';
import { MAX_TG_MESSAGE } from './telegram-docs.ui';

type TextMessageContext = Filter<Context, 'message:text'>;

@Injectable()
export class ChatHandler {
  private readonly logger = new Logger(ChatHandler.name);

  constructor(private readonly chat: ChatService) {}

  register(bot: Bot): void {
    bot.command('start', async (ctx) => {
      await ctx.reply(
        'Привет! Я бот, отвечаю на вопросы по базе знаний.\n' +
          'Просто задай вопрос — и я найду ответ в загруженных документах.',
      );
    });

    bot.on('message:text', async (ctx) => {
      await this.onTextMessage(ctx);
    });
  }

  private async onTextMessage(ctx: TextMessageContext): Promise<void> {
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
  }
}
