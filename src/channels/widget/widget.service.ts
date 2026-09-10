import { Injectable } from '@nestjs/common';
import { ChatService } from '../../core/chat.service';

@Injectable()
export class WidgetService {
  constructor(private readonly chat: ChatService) {}

  async handleMessage(message: string) {
    return await this.chat.handleUserMessage(message);
  }
}
