import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './ai/embedding.service';
import { GenerationService } from './ai/generation.service';
import type { ToolSet } from 'ai';
import { QdrantService } from './vector/qdrant.service';

const TOP_K = 4;

const SYSTEM_PROMPT = [
  'Ты — ассистент бизнеса. Отвечай строго по предоставленному контексту.',
  'Если в контексте нет ответа — ответь ровно: «Такой информации не найдено».',
  'Отвечай кратко и по делу, на языке вопроса.',
].join(' ');

export interface ChatReply {
  answer: string;
  sources: string[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly generation: GenerationService,
    private readonly qdrant: QdrantService,
  ) {}

  async handleUserMessage(userText: string, tools: ToolSet = {}): Promise<ChatReply> {
    const [queryVector] = await this.embedding.embed([userText]);
    if (!queryVector) {
      throw new Error('Empty query embedding');
    }

    const hits = await this.qdrant.search(queryVector, TOP_K);
    const relevant = hits.filter((h) => h.score >= 0.3);

    if (relevant.length === 0) {
      return { answer: 'Такой информации не найдено', sources: [] };
    }

    const context = relevant
      .map((h) => h.payload?.['text'])
      .filter((t): t is string => typeof t === 'string' && t.length > 0)
      .join('\n\n---\n\n');
    const sources = [...new Set(relevant.map((h) => h.payload?.['fileName']))].filter(
      (name): name is string => typeof name === 'string' && name.length > 0,
    );

    const answer = await this.generation.generate(
      `${SYSTEM_PROMPT}\n\nКонтекст:\n${context}`,
      userText,
      { tools },
    );
    this.logger.log(`Answered using ${relevant.length} chunks (sources: ${sources.join(', ')})`);
    return { answer, sources };
  }
}
