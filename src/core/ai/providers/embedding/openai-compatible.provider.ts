import { createOpenAI } from '@ai-sdk/openai';
import type { EmbeddingModelV4 } from '@ai-sdk/provider';
import { embedMany } from 'ai';
import type { AppConfig } from '../../../../config/app.config';
import { BaseEmbeddingProvider } from '../../interfaces/embedding-provider.interface';

export class OpenAICompatibleEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly model: EmbeddingModelV4;

  protected readonly maxRetries: number;

  constructor(config: AppConfig, baseUrl: string, apiKey: string, modelName: string) {
    super();
    this.maxRetries = config.LLM_MAX_RETRIES;
    const client = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiKey.length > 0 ? apiKey : 'not-provided',
    });
    this.model = client.textEmbeddingModel(modelName);
  }

  async embed(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({ model: this.model, values: texts });
    return embeddings.map((e) => Array.from(e));
  }
}
