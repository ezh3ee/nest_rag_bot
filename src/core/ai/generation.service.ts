import { Injectable, Logger } from '@nestjs/common';
import { LLMFactory } from './llm.factory';
import { BaseGenerationProvider } from './interfaces/generation-provider.interface';
import type { GenerationOptions } from './interfaces/generation-provider.interface';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private readonly provider: BaseGenerationProvider;

  constructor(factory: LLMFactory) {
    this.provider = factory.createGeneration();
  }

  async generate(system: string, message: string, options?: GenerationOptions): Promise<string> {
    this.logger.debug(
      `Generating response (${this.provider.constructor.name})`,
      GenerationService.name,
    );
    return this.provider.generateWithRetry(system, message, options);
  }
}
