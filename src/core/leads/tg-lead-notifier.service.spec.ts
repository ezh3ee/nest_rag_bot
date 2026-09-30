import type { AppConfig } from '../../config/app.config';
import type { INotifier } from '../ai/interfaces/notifier.interface';
import { TgLeadNotifierService } from './tg-lead-notifier.service';

const CONFIG = {
  TELEGRAM_BOT_TOKEN: '123456:BOT-TOKEN',
  ADMIN_CHAT_ID: 110159942,
} as unknown as AppConfig;

// Тип мока совпадает с настоящим `fetch`, поэтому подмена global.fetch проходит без кастов
const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
const originalFetch = global.fetch;

const buildService = (): TgLeadNotifierService => new TgLeadNotifierService(CONFIG);

const sentBody = (): string => {
  const body = fetchMock.mock.calls[0][1]?.body;
  return typeof body === 'string' ? body : '';
};

describe('TgLeadNotifierService', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('posts the lead to the configured admin chat', async () => {
    await buildService().notify({ name: 'Иван', phone: '+79251234567' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bot123456:BOT-TOKEN/sendMessage');
    expect(init?.method).toBe('POST');
    expect(sentBody()).toContain('"chat_id":110159942');
  });

  it('includes the name and the phone in the message', async () => {
    await buildService().notify({ name: 'Иван', phone: '+79251234567' });

    expect(sentBody()).toContain('Иван');
    expect(sentBody()).toContain('+79251234567');
  });

  it('includes the optional fields when they are present', async () => {
    await buildService().notify({
      name: 'Иван',
      phone: '+79251234567',
      age: 7,
      comment: 'после 18:00',
    });

    const body = sentBody();
    expect(body).toContain('7');
    expect(body).toContain('после 18:00');
  });

  it('omits the optional fields when they are absent', async () => {
    await buildService().notify({ name: 'Иван', phone: '+79251234567' });

    expect(sentBody()).not.toContain('Возраст');
    expect(sentBody()).not.toContain('undefined');
    expect(sentBody()).not.toContain('null');
  });

  it('throws when Telegram answers with an error status', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Request: chat not found', { status: 400 }));

    await expect(buildService().notify({ name: 'Иван', phone: '+79251234567' })).rejects.toThrow(
      /Telegram API error 400/,
    );
  });

  it('propagates a network failure of the fetch itself', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));

    await expect(buildService().notify({ name: 'Иван', phone: '+79251234567' })).rejects.toThrow(
      'fetch failed',
    );
  });

  it('sends every provided field exactly once', async () => {
    const lead: INotifier = { name: 'Пётр', phone: '+79001234567' };

    await buildService().notify(lead);

    expect(sentBody().match(/Пётр/g)).toHaveLength(1);
  });
});
