import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { EmbeddingModelV4 } from '@ai-sdk/provider';
import { Embeddings } from '@langchain/core/embeddings';
import { embedMany } from 'ai';
import type { EmbeddingGoogleConfig } from '../../../../config/llm.schema';

export class GoogleEmbeddings extends Embeddings {
  private readonly model: EmbeddingModelV4;

  constructor(cfg: EmbeddingGoogleConfig, maxRetries: number) {
    super({ maxRetries });
    const client = createGoogleGenerativeAI({ apiKey: cfg.apiKey });
    this.model = client.embedding(cfg.model);
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
