import { Global, Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { GenerationService } from './generation.service';
import { LLMFactory } from './llm.factory';

@Global()
@Module({
  providers: [LLMFactory, EmbeddingService, GenerationService],
  exports: [EmbeddingService, GenerationService],
})
export class AiModule {}
