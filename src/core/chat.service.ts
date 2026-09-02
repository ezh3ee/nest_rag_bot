import { Injectable, Logger } from '@nestjs/common';
import type { ToolSet } from 'ai';
import { GenerationService } from './ai/generation.service';
import { QdrantService } from './vector/qdrant.service';

const TOP_K = 4;
const SCORE_THRESHOLD = 0.3;

const SYSTEM_PROMPT = [
  'Ты — ассистент бизнеса. Отвечай строго по предоставленному контексту.',
  // 'Если в контексте нет ответа — ответь ровно: «Такой информации не найдено».',
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
    private readonly generation: GenerationService,
    private readonly qdrant: QdrantService,
  ) {}

  async handleUserMessage(userText: string, tools: ToolSet = {}): Promise<ChatReply> {
    const results = await this.qdrant.search(userText, TOP_K);
    const relevant = results.filter((r) => r.score >= SCORE_THRESHOLD);

    if (relevant.length === 0) {
      return { answer: 'Такой информации не найдено', sources: [] };
    }

    const context = relevant.map((r) => r.text).join('\n\n---\n\n');
    const sources = [...new Set(relevant.map((r) => r.fileName))].filter(Boolean);

    const answer = await this.generation.generate(
      `${SYSTEM_PROMPT}\n\nКонтекст:\n${context}`,
      userText,
      { tools },
    );
    this.logger.log(`Answered using ${relevant.length} chunks (sources: ${sources.join(', ')})`);
    return { answer, sources };
  }
}
