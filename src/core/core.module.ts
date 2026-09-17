import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { ChatService } from './chat.service';
import { ChatLogService } from './chat-log.service';
import { IngestModule } from './ingest/ingest.module';
import { VectorModule } from './vector/vector.module';

@Module({
  imports: [AiModule, VectorModule, IngestModule],
  providers: [ChatService, ChatLogService],
  exports: [ChatService, IngestModule],
})
export class CoreModule {}
