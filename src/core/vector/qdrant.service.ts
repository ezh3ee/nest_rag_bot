import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import appConfig from '../../config/app.config';
import { LLMFactory } from '../ai/llm.factory';
import type { Chunk } from '../ingest/chunker.service';

export interface SearchHit {
  text: string;
  score: number;
  fileName: string;
}

@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private readonly store: QdrantVectorStore;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    factory: LLMFactory,
  ) {
    this.client = new QdrantClient({ url: config.QDRANT_URL });
    this.store = new QdrantVectorStore(factory.createEmbedding(), {
      url: config.QDRANT_URL,
      collectionName: config.QDRANT_COLLECTION,
      collectionConfig: {
        vectors: {
          size: config.EMBEDDING_DIM,
          distance: 'Cosine',
        },
      },
    });
  }

  async addChunks(documentId: string, fileName: string, chunks: Chunk[]): Promise<void> {
    const docs = chunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.text,
          metadata: { documentId, chunkIndex: chunk.index, fileName },
        }),
    );
    await this.store.addDocuments(docs);
    this.logger.log(`Added ${chunks.length} chunks for document ${documentId}`);
  }

  async search(query: string, limit: number): Promise<SearchHit[]> {
    const results = await this.store.similaritySearchWithScore(query, limit);
    return results.map(([doc, score]) => ({
      text: doc.pageContent,
      score,
      fileName: String(doc.metadata['fileName'] ?? ''),
    }));
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await this.client.delete(this.config.QDRANT_COLLECTION, {
      filter: {
        must: [{ key: 'metadata.documentId', match: { value: documentId } }],
      },
    });
    this.logger.log(`Deleted points for document ${documentId}`);
  }
}
