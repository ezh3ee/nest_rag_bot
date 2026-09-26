import { Module } from '@nestjs/common';
import { ChatMemoryService } from '../memory/chat-memory.service';
import { RedisModule } from '../memory/redis.module';
import { AiModule } from './ai/ai.module';
import { LEAD_NOTIFIER } from './ai/interfaces/notifier.interface';
import { ChatLogService } from './chat-log.service';
import { ChatService } from './chat.service';
import { IngestModule } from './ingest/ingest.module';
import { TgLeadNotifierService } from './leads/tg-lead-notifier.service';
import { VectorModule } from './vector/vector.module';

@Module({
  imports: [AiModule, VectorModule, IngestModule, RedisModule],
  providers: [
    ChatService,
    ChatLogService,
    ChatMemoryService,
    { provide: LEAD_NOTIFIER, useClass: TgLeadNotifierService },
  ],
  exports: [ChatService, IngestModule],
})
export class CoreModule {}
