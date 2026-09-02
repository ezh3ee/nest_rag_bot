import type { EmbeddingModelV2 } from '@ai-sdk/provider';
import { Embeddings } from '@langchain/core/embeddings';
import { embedMany } from 'ai';
import { createJina } from 'jina-ai-provider';
import type { EmbeddingOpenAILikeConfig } from '../../../../config/llm.schema';

type OpenAICompatibleEmbeddingConfig = EmbeddingOpenAILikeConfig;

export class JinaEmbeddings extends Embeddings {
  private readonly model: EmbeddingModelV2<string>;

  constructor(cfg: OpenAICompatibleEmbeddingConfig, maxRetries: number) {
    super({ maxRetries });

    const client = createJina({
      baseURL: cfg.baseUrl,
      apiKey: cfg.apiKey,
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
