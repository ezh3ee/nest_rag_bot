import { ChatReply, ChatService } from '../../core/chat.service';
import { WidgetCounterService } from './widget-counter.service';
import { WidgetService } from './widget.service';

const buildService = (reply: ChatReply) => {
  const handleUserMessage = jest.fn().mockResolvedValue(reply);
  const increment = jest.fn().mockResolvedValue(undefined);

  const chat = { handleUserMessage } as unknown as ChatService;
  const counter = { increment } as unknown as WidgetCounterService;

  return { service: new WidgetService(chat, counter), handleUserMessage, increment };
};

describe('WidgetService', () => {
  it('passes the message and the chat id to the chat service', async () => {
    const { service, handleUserMessage } = buildService({ answer: 'ответ', sources: ['voin.md'] });

    await service.handleMessage('привет', 'widget-session-1');

    expect(handleUserMessage).toHaveBeenCalledWith('привет', 'widget-session-1');
  });

  it('returns the answer produced by the chat service', async () => {
    const reply: ChatReply = { answer: 'ответ', sources: ['voin.md'] };
    const { service } = buildService(reply);

    await expect(service.handleMessage('привет', 'widget-session-1')).resolves.toEqual(reply);
  });

  it('charges the daily budget for a real answer', async () => {
    const { service, increment } = buildService({ answer: 'ответ', sources: [] });

    await service.handleMessage('привет', 'widget-session-1');

    expect(increment).toHaveBeenCalledTimes(1);
  });

  it('does not charge the budget when nothing was answered', async () => {
    const { service, increment } = buildService({ answer: '', sources: [] });

    await service.handleMessage('привет', 'widget-session-1');

    expect(increment).not.toHaveBeenCalled();
  });
});
