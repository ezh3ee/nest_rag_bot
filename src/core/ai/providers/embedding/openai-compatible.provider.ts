import { createOpenAI } from '@ai-sdk/openai';
import type { EmbeddingModelV4 } from '@ai-sdk/provider';
import { embedMany } from 'ai';
import { Embeddings } from '@langchain/core/embeddings';
import type { EmbeddingOllamaConfig } from '../../../../config/app.schema';
import type { EmbeddingOpenAILikeConfig } from '../../../../config/app.schema';

type OpenAICompatibleEmbeddingConfig = EmbeddingOpenAILikeConfig | EmbeddingOllamaConfig;

export class OpenAICompatibleEmbeddings extends Embeddings {
  private readonly model: EmbeddingModelV4;

  constructor(cfg: OpenAICompatibleEmbeddingConfig, maxRetries: number) {
    super({ maxRetries });
    const client = createOpenAI({
      baseURL: cfg.baseUrl,
      apiKey: 'apiKey' in cfg && cfg.apiKey.length > 0 ? cfg.apiKey : 'not-provided',
    });
    this.model = client.textEmbeddingModel(cfg.model);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({ model: this.model, values: texts });
    return embeddings.map((e) => Array.from(e));
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embedDocuments([text]);
    return vector ?? [];
  }
}
