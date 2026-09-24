import { HumanMessage } from '@langchain/core/messages';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ToolSet } from 'ai';
import { ChatMemoryService } from '../memory/chat-memory.service';
import { GenerationService } from './ai/generation.service';
import { LEAD_NOTIFIER, LeadNotifier } from './ai/interfaces/notifier.interface';
import { createApplicationTool } from './ai/tools/create-application.tool';
import { ChatLogService } from './chat-log.service';
import { QdrantService } from './vector/qdrant.service';

const TOP_K = 4;
const SCORE_THRESHOLD = 0.3;

const SYSTEM_PROMPT = [
  'Ты — ассистент бизнеса. Отвечай строго по предоставленному контексту.',
  'В ответах не выделяй текст с помощью знаков **ТЕКСТ**, если хочешь сделать его жирным.',
  'Если точного ответа нет в контексте, но его можно логически вывести ИМЕННО ИЗ имеющихся данных — сделай вывод и укажи, что это основано на общих сведениях. Если вывести невозможно — скажи, что информации нет, и предложи позвонить по телефону, прийти лично.',
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
    private readonly chatLog: ChatLogService,
    private readonly chatMemory: ChatMemoryService,
    @Inject(LEAD_NOTIFIER)
    private readonly lead: LeadNotifier,
  ) {}

  async handleUserMessage(
    userText: string,
    chatId: string,
    tools: ToolSet = {
      createApplicationTool: createApplicationTool(this.lead),
    },
  ): Promise<ChatReply> {
    const results = await this.qdrant.search(userText, TOP_K);
    const relevant = results.filter((r) => r.score >= SCORE_THRESHOLD);

    const chatHistory = await this.chatMemory.getMessages(chatId);

    let formattedHistory;
    if (chatHistory.length > 0) {
      formattedHistory = chatHistory
        .map((m) => (m instanceof HumanMessage ? `<USER> ${m.text}` : `<AI>: ${m.text}`))
        .join('\n');
    }

    if (relevant.length === 0) {
      await this.chatLog.write(userText, 'Такой информации не найдено');
      return { answer: 'Такой информации не найдено', sources: [] };
    }

    const context = relevant.map((r) => r.text).join('\n\n---\n\n');
    const sources = [...new Set(relevant.map((r) => r.fileName))].filter(Boolean);

    const answer = await this.generation.generate(
      `
      **SYSTEM PROMPT**
      ${SYSTEM_PROMPT}
      **CONTEXT**
      ${context}
      **CHAT HISTORY**
      ${formattedHistory}
      `,
      userText,
      { tools },
    );

    await this.chatMemory.addMessage(chatId, 'user', userText);
    await this.chatMemory.addMessage(chatId, 'assistant', answer);

    this.logger.log(`Answered using ${relevant.length} chunks (sources: ${sources.join(', ')})`);

    await this.chatLog.write(userText, answer);
    return { answer, sources };
  }
}
