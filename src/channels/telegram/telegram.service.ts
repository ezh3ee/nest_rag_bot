import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Bot } from 'grammy';
import appConfig from '../../config/app.config';
import { ChatHandler } from './telegram-chat.handler';
import { DocsHandler } from './telegram-docs.handler';
import { FileHandler } from './telegram-file.handler';
import { syncCommandMenus, syncGroupCommands } from './telegram-commands';

@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bot: Bot;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    private readonly docsHandler: DocsHandler,
    private readonly fileHandler: FileHandler,
    private readonly chatHandler: ChatHandler,
  ) {
    this.bot = new Bot(config.TELEGRAM_BOT_TOKEN);

    this.docsHandler.register(this.bot);
    this.fileHandler.register(this.bot);
    this.chatHandler.register(this.bot);

    this.registerChatMemberSync();
  }

  async onApplicationBootstrap(): Promise<void> {
    this.bot.catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bot error: ${message}`);
    });

    try {
      await syncCommandMenus(this.bot, this.config.ADMIN_CHAT_ID);
      this.logger.log('Command menus synced');
    } catch (error) {
      this.logger.error(
        `Command menus sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.bot.start({
      onStart: (me) => this.logger.log(`Bot started as @${me.username}`),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.bot.stop();
    this.logger.log('Bot stopped');
  }

  private registerChatMemberSync(): void {
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
}
