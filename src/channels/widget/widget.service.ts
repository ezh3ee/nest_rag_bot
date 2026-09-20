import { Injectable } from '@nestjs/common';
import { ChatReply, ChatService } from '../../core/chat.service';
import { WidgetCounterService } from './widget-counter.service';

@Injectable()
export class WidgetService {
  constructor(
    private readonly chat: ChatService,
    private readonly counter: WidgetCounterService,
  ) {}

  async handleMessage(message: string, chatId: string): Promise<ChatReply> {
    const result = await this.chat.handleUserMessage(message, chatId);

    if (result.answer) await this.counter.increment();

    return result;
  }
}
