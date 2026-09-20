import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { RedisChatMessageHistory } from '@langchain/redis';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatMemoryService {
  private readonly TTL = 60 * 60 * 1 * 1; // 1 hour

  private getHistory(sessionId: string): RedisChatMessageHistory {
    return new RedisChatMessageHistory({
      sessionId,
      sessionTTL: this.TTL,
    });
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    const message = role === 'user' ? new HumanMessage(content) : new AIMessage(content);
    await this.getHistory(sessionId).addMessage(message);
  }

  async getMessages(sessionId: string): Promise<BaseMessage[]> {
    return this.getHistory(sessionId).getMessages();
  }

  async clear(sessionId: string): Promise<void> {
    await this.getHistory(sessionId).clear();
  }
}
