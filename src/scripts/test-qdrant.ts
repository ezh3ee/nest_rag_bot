import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { TestCoreModule } from './test-core.module';
import { QdrantService } from '../core/vector/qdrant.service';

function makeVector(seed: number, dim: number): number[] {
  return Array.from({ length: dim }, (_, i) => Math.sin(seed * (i + 1)));
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(TestCoreModule, { logger: false });
  const qdrant = app.get(QdrantService);
  const dim = 1536;

  await qdrant.ensureCollection();
  console.log('OK: collection ensured');

  const doc1 = randomUUID();
  const doc2 = randomUUID();
  const idA = randomUUID();
  const idB = randomUUID();
  const idC = randomUUID();

  await qdrant.upsert([
    { id: idA, vector: makeVector(1.0, dim), payload: { text: 'apple doc1', documentId: doc1 } },
    { id: idB, vector: makeVector(1.05, dim), payload: { text: 'apricot doc1', documentId: doc1 } },
    { id: idC, vector: makeVector(9.0, dim), payload: { text: 'zebra doc2', documentId: doc2 } },
  ]);
  console.log('OK: upserted 3 points');

  const hits = await qdrant.search(makeVector(1.0, dim), 2);
  console.log(
    'SEARCH top-2 near seed 1.0:',
    hits.map((h) => `${String(h.payload?.['text'])} (score=${h.score.toFixed(3)})`),
  );

  const wrongSearch = hits.filter((h) => h.payload?.['documentId'] !== doc1);
  if (hits.length !== 2 || wrongSearch.length > 0 || hits[0]?.payload?.['documentId'] !== doc1) {
    const firstPayload = hits[0]?.payload;
    const detail = firstPayload === undefined ? 'no hits' : JSON.stringify(firstPayload);
    throw new Error(`Search returned unexpected results: ${detail}`);
  }

  const all = await qdrant.scrollAll();
  console.log(`SCROLL: ${all.length} points (expected 3)`);
  if (all.length !== 3) {
    throw new Error('scrollAll returned unexpected count');
  }

  await qdrant.deletePoints([idA, idB, idC]);
  const afterDelete = await qdrant.scrollAll();
  console.log(`DELETE: ${afterDelete.length} points left (expected 0)`);
  if (afterDelete.length !== 0) {
    throw new Error('deletePoints failed');
  }

  await app.close();
  console.log('QDRANT TEST PASSED');
}

void main();
