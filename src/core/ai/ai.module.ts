import { Global, Module } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { LLMFactory } from './llm.factory';

@Global()
@Module({
  providers: [LLMFactory, GenerationService],
  exports: [LLMFactory, GenerationService],
})
export class AiModule {}
