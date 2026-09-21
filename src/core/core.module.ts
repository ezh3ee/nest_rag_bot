import { Module } from '@nestjs/common';
import { ChatMemoryService } from '../memory/chat-memory.service';
import { RedisModule } from '../memory/redis.module';
import { AiModule } from './ai/ai.module';
import { ChatLogService } from './chat-log.service';
import { ChatService } from './chat.service';
import { IngestModule } from './ingest/ingest.module';
import { VectorModule } from './vector/vector.module';

@Module({
  imports: [AiModule, VectorModule, IngestModule, RedisModule],
  providers: [ChatService, ChatLogService, ChatMemoryService],
  exports: [ChatService, IngestModule],
})
export class CoreModule {}
