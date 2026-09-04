import { Embeddings } from '@langchain/core/embeddings';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import llmConfig from '../../config/llm.config';
import { BaseGenerationProvider } from './interfaces/generation-provider.interface';
import { GoogleEmbeddings } from './providers/embedding/google.provider';
import { JinaEmbeddings } from './providers/embedding/jina.provider';
import { OpenAICompatibleEmbeddings } from './providers/embedding/openai-compatible.provider';
import { GoogleGenerationProvider } from './providers/generation/google.provider';
import { OpenAICompatibleGenerationProvider } from './providers/generation/openai-compatible.provider';

@Injectable()
export class LLMFactory {
  constructor(
    @Inject(llmConfig.KEY)
    private readonly config: ConfigType<typeof llmConfig>,
  ) {}

  createGeneration(): BaseGenerationProvider {
    const cfg = this.config.generation;
    const maxRetries = this.config.LLM_MAX_RETRIES;

    switch (cfg.provider) {
      case 'google':
        return new GoogleGenerationProvider(cfg, maxRetries);
      case 'openai':
      case 'groq':
      case 'polza':
      case 'ollama':
        return new OpenAICompatibleGenerationProvider(cfg, maxRetries);
    }
  }

  createEmbedding(): Embeddings {
    const cfg = this.config.embedding;
    const maxRetries = this.config.LLM_MAX_RETRIES;

    switch (cfg.provider) {
      case 'google':
        return new GoogleEmbeddings(cfg, maxRetries);
      case 'jina':
        return new JinaEmbeddings(cfg, maxRetries);
      case 'openai':
      case 'ollama':
        return new OpenAICompatibleEmbeddings(cfg, maxRetries);
    }
  }
}
