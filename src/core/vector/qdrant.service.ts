import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import appConfig from '../../config/app.config';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface SearchHit {
  id: string;
  score: number;
  payload: Record<string, unknown> | null;
}

@Injectable()
export class QdrantService {
  private readonly client: QdrantClient;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    this.client = new QdrantClient({ url: config.QDRANT_URL });
  }

  async ensureCollection(): Promise<void> {
    const collectionName = this.config.QDRANT_COLLECTION;
    const exists = await this.client.collectionExists(collectionName);
    if (!exists.exists) {
      await this.client.createCollection(collectionName, {
        vectors: {
          size: this.config.EMBEDDING_DIM,
          distance: 'Cosine',
        },
      });
    }
  }

  async upsert(points: VectorPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }
    await this.client.upsert(this.config.QDRANT_COLLECTION, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  async search(vector: number[], limit: number): Promise<SearchHit[]> {
    const result = await this.client.query(this.config.QDRANT_COLLECTION, {
      query: { nearest: vector },
      limit,
      with_payload: true,
    });
    return result.points.map((point) => ({
      id: String(point.id),
      score: point.score ?? 0,
      payload: point.payload ?? null,
    }));
  }

  async deletePoints(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.client.delete(this.config.QDRANT_COLLECTION, {
      points: ids,
    });
  }

  async scrollAll(): Promise<VectorPoint[]> {
    const collectionName = this.config.QDRANT_COLLECTION;
    const points: VectorPoint[] = [];
    let offset: string | number | Record<string, unknown> | null | undefined;
    for (;;) {
      const page = await this.client.scroll(collectionName, {
        limit: 256,
        offset,
        with_payload: true,
      });
      for (const point of page.points) {
        points.push({
          id: String(point.id),
          vector: [],
          payload: point.payload ?? {},
        });
      }
      if (page.next_page_offset === undefined || page.next_page_offset === null) {
        break;
      }
      offset = page.next_page_offset;
    }
    return points;
  }
}
