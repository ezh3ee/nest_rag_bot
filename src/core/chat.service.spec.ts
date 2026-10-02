import { HumanMessage } from '@langchain/core/messages';
import { ChatLogService } from './chat-log.service';
import { ChatService } from './chat.service';
import { GenerationService } from './ai/generation.service';
import type { LeadNotifier } from './ai/interfaces/notifier.interface';
import { QdrantService } from './vector/qdrant.service';
import type { SearchHit } from './vector/qdrant.service';
import { ChatMemoryService } from '../memory/chat-memory.service';

const hit = (text: string, score: number, fileName: string): SearchHit => ({
  text,
  score,
  fileName,
});

type GenerateFn = (
  system: string,
  message: string,
  options?: { tools?: Record<string, unknown> },
) => Promise<string>;

type BuildOptions = {
  hits?: SearchHit[];
  answer?: string;
  history?: unknown[];
};

const buildService = (options: BuildOptions = {}) => {
  const search = jest
    .fn<Promise<SearchHit[]>, [query: string, limit: number]>()
    .mockResolvedValue(options.hits ?? []);
  const generate = jest
    .fn<Promise<string>, Parameters<GenerateFn>>()
    .mockResolvedValue(options.answer ?? 'ответ модели');
  const write = jest
    .fn<Promise<void>, [question: string, answer: string]>()
    .mockResolvedValue(undefined);
  const getMessages = jest
    .fn<Promise<unknown[]>, [chatId: string]>()
    .mockResolvedValue(options.history ?? []);
  const addMessage = jest
    .fn<Promise<void>, [chatId: string, role: string, text: string]>()
    .mockResolvedValue(undefined);

  const leadNotifier: LeadNotifier = { notify: jest.fn() };

  const service = new ChatService(
    { generate } as unknown as GenerationService,
    { search } as unknown as QdrantService,
    { write } as unknown as ChatLogService,
    { getMessages, addMessage } as unknown as ChatMemoryService,
    leadNotifier,
  );

  return { service, search, generate, write, getMessages, addMessage };
};

// jest.Mock<возврат, аргументы>: так же, как у самого generate
type GenerateMock = jest.Mock<Promise<string>, Parameters<GenerateFn>>;

const systemPromptOf = (generate: GenerateMock): string => String(generate.mock.calls[0][0]);
const userPromptOf = (generate: GenerateMock): string => String(generate.mock.calls[0][1]);

describe('ChatService — отсутствие релевантного контекста', () => {
  it('отвечает «не найдено», не доходя до модели', async () => {
    const { service, generate } = buildService({ hits: [] });

    await expect(service.handleUserMessage('вопрос', 'chat-1')).resolves.toEqual({
      answer: 'Такой информации не найдено',
      sources: [],
    });

    expect(generate).not.toHaveBeenCalled();
  });

  it('отбрасывает попадания ниже порога 0.3', async () => {
    const { service, generate } = buildService({
      hits: [hit('почти не в тему', 0.29, 'a.md')],
    });

    const reply = await service.handleUserMessage('вопрос', 'chat-1');

    expect(reply.answer).toBe('Такой информации не найдено');
    expect(generate).not.toHaveBeenCalled();
  });

  it('пишет в лог даже ответ-заглушку', async () => {
    const { service, write } = buildService({ hits: [] });

    await service.handleUserMessage('вопрос', 'chat-1');

    expect(write).toHaveBeenCalledWith('вопрос', 'Такой информации не найдено');
  });
});

describe('ChatService — сборка промпта', () => {
  it('кладёт текст найденных чанков в контекст', async () => {
    const { service, generate } = buildService({
      hits: [hit('первый чанк', 0.9, 'voin.md'), hit('второй чанк', 0.5, 'price.md')],
    });

    await service.handleUserMessage('вопрос', 'chat-1');

    const system = systemPromptOf(generate);
    expect(system).toContain('первый чанк');
    expect(system).toContain('второй чанк');
  });

  it('отдаёт уникальные имена файлов как источники', async () => {
    const { service } = buildService({
      hits: [hit('а', 0.9, 'voin.md'), hit('б', 0.8, 'voin.md'), hit('в', 0.7, 'price.md')],
    });

    const reply = await service.handleUserMessage('вопрос', 'chat-1');

    expect(reply.sources).toEqual(['voin.md', 'price.md']);
  });

  it('передаёт сообщение пользователя как отдельный промпт', async () => {
    const { service, generate } = buildService({ hits: [hit('контекст', 0.9, 'a.md')] });

    await service.handleUserMessage('сколько стоит?', 'chat-1');

    expect(userPromptOf(generate)).toBe('сколько стоит?');
  });

  it('подставляет историю диалога в промпт', async () => {
    const { service, generate } = buildService({
      hits: [hit('контекст', 0.9, 'a.md')],
      history: [new HumanMessage('хочу записаться')],
    });

    await service.handleUserMessage('завтра в 18', 'chat-1');

    expect(systemPromptOf(generate)).toContain('<USER> хочу записаться');
  });

  it('не пишет слово undefined, когда истории нет', async () => {
    const { service, generate } = buildService({ hits: [hit('контекст', 0.9, 'a.md')] });

    await service.handleUserMessage('вопрос', 'chat-1');

    expect(systemPromptOf(generate)).not.toContain('undefined');
  });

  it('передаёт инструменты в генерацию', async () => {
    const { service, generate } = buildService({ hits: [hit('контекст', 0.9, 'a.md')] });

    await service.handleUserMessage('вопрос', 'chat-1');

    expect(generate.mock.calls[0][2]).toHaveProperty('tools');
    expect(generate.mock.calls[0][2]?.tools).toHaveProperty('createApplicationTool');
  });
});

describe('ChatService — память и результат', () => {
  it('сохраняет вопрос и ответ в историю чата', async () => {
    const { service, addMessage } = buildService({
      hits: [hit('контекст', 0.9, 'a.md')],
      answer: 'ответ модели',
    });

    await service.handleUserMessage('вопрос', 'chat-42');

    expect(addMessage).toHaveBeenCalledWith('chat-42', 'user', 'вопрос');
    expect(addMessage).toHaveBeenCalledWith('chat-42', 'assistant', 'ответ модели');
  });

  it('возвращает ответ модели и источники', async () => {
    const { service } = buildService({
      hits: [hit('контекст', 0.9, 'voin.md')],
      answer: 'занятие стоит 1000',
    });

    await expect(service.handleUserMessage('сколько?', 'chat-1')).resolves.toEqual({
      answer: 'занятие стоит 1000',
      sources: ['voin.md'],
    });
  });

  it('ищет в векторной базе по тексту вопроса', async () => {
    const { service, search } = buildService({ hits: [hit('контекст', 0.9, 'a.md')] });

    await service.handleUserMessage('сколько стоит', 'chat-1');

    expect(search).toHaveBeenCalledWith('сколько стоит', 4);
  });

  it('читает историю именно этого чата', async () => {
    const { service, getMessages } = buildService({ hits: [hit('контекст', 0.9, 'a.md')] });

    await service.handleUserMessage('вопрос', 'chat-7');

    expect(getMessages).toHaveBeenCalledWith('chat-7');
  });
});
