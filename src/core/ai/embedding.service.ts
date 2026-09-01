import { Injectable, Logger } from '@nestjs/common';
import { LLMFactory } from './llm.factory';
import { BaseEmbeddingProvider } from './interfaces/embedding-provider.interface';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly provider: BaseEmbeddingProvider;

  constructor(factory: LLMFactory) {
    this.provider = factory.createEmbedding();
  }

  async embed(texts: string[]): Promise<number[][]> {
    this.logger.debug(`Embedding ${texts.length} chunk(s)`, EmbeddingService.name);
    return this.provider.embedWithRetry(texts);
  }
}
