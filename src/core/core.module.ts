import { Module } from '@nestjs/common';
import { ChatMemoryService } from '../memory/chat-memory.service';
import { AiModule } from './ai/ai.module';
import { ChatLogService } from './chat-log.service';
import { ChatService } from './chat.service';
import { IngestModule } from './ingest/ingest.module';
import { VectorModule } from './vector/vector.module';

@Module({
  imports: [AiModule, VectorModule, IngestModule],
  providers: [ChatService, ChatLogService, ChatMemoryService],
  exports: [ChatService, IngestModule],
})
export class CoreModule {}
