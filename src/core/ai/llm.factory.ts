import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { AppConfig } from '../../config/app.config';
import appConfig from '../../config/app.config';
import { BaseEmbeddingProvider } from './interfaces/embedding-provider.interface';
import { BaseGenerationProvider } from './interfaces/generation-provider.interface';
import { GoogleEmbeddingProvider } from './providers/embedding/google.provider';
import { OpenAICompatibleEmbeddingProvider } from './providers/embedding/openai-compatible.provider';
import { GoogleGenerationProvider } from './providers/generation/google.provider';
import { OpenAICompatibleGenerationProvider } from './providers/generation/openai-compatible.provider';

type GenerationProviderName = AppConfig['LLM_GENERATION_PROVIDER'];
type EmbeddingProviderName = AppConfig['LLM_EMBEDDING_PROVIDER'];

@Injectable()
export class LLMFactory {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  createGeneration(): BaseGenerationProvider {
    const c = this.config;
    const providers: Record<GenerationProviderName, () => BaseGenerationProvider> = {
      openai: () =>
        this.createOpenAICompatibleGeneration(
          c.LLM_GENERATION_BASE_URL,
          c.LLM_GENERATION_API_KEY,
          c.LLM_GENERATION_MODEL,
        ),
      groq: () =>
        this.createOpenAICompatibleGeneration(
          c.LLM_GENERATION_BASE_URL,
          c.LLM_GENERATION_API_KEY,
          c.LLM_GENERATION_MODEL,
        ),
      polza: () =>
        this.createOpenAICompatibleGeneration(
          c.LLM_GENERATION_BASE_URL,
          c.LLM_GENERATION_API_KEY,
          c.LLM_GENERATION_MODEL,
        ),
      ollama: () =>
        this.createOpenAICompatibleGeneration(
          c.LLM_GENERATION_BASE_URL,
          c.LLM_GENERATION_API_KEY,
          c.LLM_GENERATION_MODEL,
        ),
      google: () =>
        new GoogleGenerationProvider(c, c.LLM_GENERATION_API_KEY, c.LLM_GENERATION_MODEL),
    };
    return providers[c.LLM_GENERATION_PROVIDER]();
  }

  createEmbedding(): BaseEmbeddingProvider {
    const c = this.config;
    const providers: Record<EmbeddingProviderName, () => BaseEmbeddingProvider> = {
      openai: () =>
        this.createOpenAICompatibleEmbedding(
          c.LLM_EMBEDDING_BASE_URL,
          c.LLM_EMBEDDING_API_KEY,
          c.LLM_EMBEDDING_MODEL,
        ),
      jina: () =>
        this.createOpenAICompatibleEmbedding(
          c.LLM_EMBEDDING_BASE_URL,
          c.LLM_EMBEDDING_API_KEY,
          c.LLM_EMBEDDING_MODEL,
        ),
      ollama: () =>
        this.createOpenAICompatibleEmbedding(
          c.LLM_EMBEDDING_BASE_URL,
          c.LLM_EMBEDDING_API_KEY,
          c.LLM_EMBEDDING_MODEL,
        ),
      google: () => new GoogleEmbeddingProvider(c, c.LLM_EMBEDDING_API_KEY, c.LLM_EMBEDDING_MODEL),
    };
    return providers[c.LLM_EMBEDDING_PROVIDER]();
  }

  private createOpenAICompatibleGeneration(
    baseUrl: string,
    apiKey: string,
    model: string,
  ): BaseGenerationProvider {
    return new OpenAICompatibleGenerationProvider(this.config, baseUrl, apiKey, model);
  }

  private createOpenAICompatibleEmbedding(
    baseUrl: string,
    apiKey: string,
    model: string,
  ): BaseEmbeddingProvider {
    return new OpenAICompatibleEmbeddingProvider(this.config, baseUrl, apiKey, model);
  }
}
