/**
 * Проверка батчинга в JinaEmbeddings БЕЗ реальных API-вызовов.
 *
 * Модули 'ai' и 'jina-ai-provider' экспортируют non-configurable свойства —
 * подменять их нельзя. Поэтому стабаем приватное поле model (EmbeddingModelV2):
 * embedMany вызывает model.doEmbed, наш стаб считает размеры батчей и возвращает
 * векторы-маркеры [len, 1], где len = длина текста. Это позволяет проверить
 * и размер батчей, и сохранность порядка на стыке батчей.
 *
 * Запуск: npx tsx src/scripts/test-jina-batching.ts
 */
import { JinaEmbeddings } from '../core/ai/providers/embedding/jina.provider';
import type { EmbeddingOpenAILikeConfig } from '../config/llm.schema';
import type { EmbeddingModelV2 } from '@ai-sdk/provider';

async function main(): Promise<void> {
  const calls: number[] = [];
  const callCount = (): number => calls.length;
  const callAt = (i: number): number => calls[i];

  const cfg = {
    provider: 'jina',
    baseUrl: 'https://mock.local/v1',
    apiKey: 'test-key',
    model: 'mock-model',
  } as EmbeddingOpenAILikeConfig;

  const emb = new JinaEmbeddings(cfg, 1);

  // Приватное поле model — стабаем doEmbed (embedMany дергает именно его)
  type MockedModel = { model: EmbeddingModelV2<string> };
  const embWithPrivate = emb as unknown as MockedModel;
  const model = embWithPrivate.model;
  if (!model || typeof model.doEmbed !== 'function') {
    throw new Error('FAIL: private model with doEmbed not found');
  }
  const originalDoEmbed = model.doEmbed.bind(model);
  model.doEmbed = async ({ values }: { values: Array<string> }) => {
    const sizes = values.map((v: string) => v.length);
    await Promise.resolve();
    calls.push(sizes.length);
    return { embeddings: sizes.map((len: number) => [len, 1]) };
  };

  try {
    // 1) Пустой вход — ни одного вызова API
    const empty = await emb.embedDocuments([]);
    if (empty.length !== 0) {
      throw new Error('FAIL: empty input must return []');
    }
    if (callCount() !== 0) {
      throw new Error('FAIL: empty input must not call API, got ' + calls.length);
    }

    // 2) 2500 текстов → 3 вызова (1024 + 1024 + 452), порядок сохранён
    const texts = Array.from({ length: 2500 }, (_, i) => 'text-' + i);
    const vectors = await emb.embedDocuments(texts);

    if (callCount() !== 3) {
      throw new Error('FAIL: expected 3 batched calls, got ' + calls.length);
    }
    if (callAt(0) !== 1024 || callAt(1) !== 1024 || calls[2] !== 452) {
      throw new Error('FAIL: batch sizes wrong: ' + calls.join(', '));
    }
    if (vectors.length !== 2500) {
      throw new Error('FAIL: expected 2500 vectors, got ' + vectors.length);
    }
    // 'text-999'.length = 8, 'text-1000'.length = 9 — стык батчей 1023|1024
    const v999 = vectors[999];
    const v1000 = vectors[1000];
    if (v999[0] !== 8 || v1000[0] !== 9) {
      throw new Error(
        'FAIL: order mismatch across batches: v999=' + v999[0] + ', v1000=' + v1000[0],
      );
    }

    // 3) Граница: ровно 1024 → один вызов
    calls.length = 0;
    await emb.embedDocuments(Array.from({ length: 1024 }, (_, i) => 't-' + i));
    if (callCount() !== 1 || calls[0] !== 1024) {
      throw new Error('FAIL: 1024 inputs must be a single call, got ' + calls.join(', '));
    }

    // 4) 1025 → 1024 + 1
    calls.length = 0;
    await emb.embedDocuments(Array.from({ length: 1025 }, (_, i) => 't-' + i));
    if (callCount() !== 2 || callAt(0) !== 1024 || callAt(1) !== 1) {
      throw new Error('FAIL: 1025 inputs must split 1024+1, got ' + calls.join(', '));
    }

    // 5) embedQuery → один вызов из одного текста
    calls.length = 0;
    const q = await emb.embedQuery('query');
    if (callCount() !== 1 || callAt(0) !== 1) {
      throw new Error('FAIL: embedQuery must be 1 call of 1, got ' + calls.join(', '));
    }
    if (q.length !== 2) {
      throw new Error('FAIL: embedQuery vector shape wrong');
    }

    console.log('ALL CHECKS PASSED');
  } finally {
    model.doEmbed = originalDoEmbed;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
