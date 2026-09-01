import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { ChatService } from './chat.service';
import { IngestModule } from './ingest/ingest.module';
import { VectorModule } from './vector/vector.module';

@Module({
  imports: [AiModule, VectorModule, IngestModule],
  providers: [ChatService],
  exports: [ChatService, IngestModule],
})
export class CoreModule {}
