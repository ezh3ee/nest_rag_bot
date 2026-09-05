import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { ChatHandler } from './telegram-chat.handler';
import { DocsHandler } from './telegram-docs.handler';
import { FileHandler } from './telegram-file.handler';
import { TelegramService } from './telegram.service';

@Module({
  imports: [CoreModule],
  providers: [TelegramService, DocsHandler, FileHandler, ChatHandler],
})
export class TelegramModule {}
