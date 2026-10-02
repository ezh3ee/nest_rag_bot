import { ChatService } from '../../core/chat.service';
import { botRecorder, contextStub } from '../../test-utils/fakes';
import { MAX_TG_MESSAGE } from './telegram-docs.ui';
import { ChatHandler } from './telegram-chat.handler';

const buildHandler = (reply: { answer: string } | Error) => {
  const handleUserMessage = jest
    .fn()
    .mockImplementation(async () =>
      reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply),
    );
  const chat = { handleUserMessage } as unknown as ChatService;
  const handler = new ChatHandler(chat);
  const recorder = botRecorder();

  handler.register(recorder.bot);

  return { recorder, handleUserMessage };
};

const textCtx = (text: string) => contextStub({ text, chatId: 500, fromId: 111 });

describe('ChatHandler — обычный вопрос', () => {
  it('показывает «печатает» сразу, не дожидаясь ответа', async () => {
    const { recorder } = buildHandler({ answer: 'ответ' });
    const { ctx, chatActions } = textCtx('привет');

    await recorder.runMessage('message:text', ctx);

    expect(chatActions[0]).toBe('typing');
  });

  it('передаёт текст и id чата в сервис', async () => {
    const { recorder, handleUserMessage } = buildHandler({ answer: 'ответ' });
    const { ctx } = textCtx('сколько стоит?');

    await recorder.runMessage('message:text', ctx);

    expect(handleUserMessage).toHaveBeenCalledWith('сколько стоит?', '500');
  });

  it('отправляет пользователю ответ модели', async () => {
    const { recorder } = buildHandler({ answer: 'занятие стоит 1000' });
    const { ctx, replies } = textCtx('сколько стоит?');

    await recorder.runMessage('message:text', ctx);

    expect(replies).toContain('занятие стоит 1000');
  });

  it('обрезает слишком длинный ответ до лимита Telegram', async () => {
    const { recorder } = buildHandler({ answer: 'я'.repeat(MAX_TG_MESSAGE + 500) });
    const { ctx, replies } = textCtx('вопрос');

    await recorder.runMessage('message:text', ctx);

    const sent = replies.find((text) => text.startsWith('я'));
    expect(sent).toHaveLength(MAX_TG_MESSAGE);
  });

  it('останавливает интервал «печатает» после ответа', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    try {
      const { recorder } = buildHandler({ answer: 'ответ' });
      const { ctx } = textCtx('вопрос');

      await recorder.runMessage('message:text', ctx);

      const intervalId = setIntervalSpy.mock.results[0]?.value;
      expect(intervalId).toBeDefined();
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    } finally {
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    }
  });
});

describe('ChatHandler — команды и ошибки', () => {
  it('на неизвестную команду отвечает подсказкой и не зовёт модель', async () => {
    const { recorder, handleUserMessage } = buildHandler({ answer: 'ответ' });
    const { ctx, replies } = textCtx('/неизвестная');

    await recorder.runMessage('message:text', ctx);

    expect(handleUserMessage).not.toHaveBeenCalled();
    expect(replies.join(' ')).toContain('Неизвестная команда');
  });

  it('на /start отвечает приветствием', async () => {
    const { recorder } = buildHandler({ answer: 'ответ' });
    const { ctx, replies } = textCtx('/start');

    await recorder.runCommand('start', ctx);

    expect(replies.join(' ')).toContain('Привет');
  });

  it('сообщает об ошибке и очищает интервал, если модель упала', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    try {
      const { recorder } = buildHandler(new Error('LLM is down'));
      const { ctx, replies } = textCtx('вопрос');

      await expect(recorder.runMessage('message:text', ctx)).resolves.toBeUndefined();

      expect(replies.join(' ')).toContain('Произошла ошибка');
      const intervalId = setIntervalSpy.mock.results[0]?.value;
      expect(intervalId).toBeDefined();
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    } finally {
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    }
  });
});
