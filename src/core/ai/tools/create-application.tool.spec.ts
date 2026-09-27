import type { INotifier, LeadNotifier } from '../interfaces/notifier.interface';
import { createApplicationTool } from './create-application.tool';

describe('createApplicationTool', () => {
  const notify = jest.fn<(lead: INotifier) => Promise<void>>().mockResolvedValue(undefined);
  const notifier: LeadNotifier = { notify };

  beforeEach(() => {
    notify.mockClear();
  });

  it('is callable by the model: exposes a description and an input schema', () => {
    const applicationTool = createApplicationTool(notifier);

    expect(applicationTool.description).toContain('Отправить заявку');
    expect(applicationTool.inputSchema).toBeDefined();
  });

  it('hands the parsed lead to the notifier', async () => {
    const execute = createApplicationTool(notifier).execute;
    expect(execute).toBeDefined();
    if (!execute) return;

    await execute(
      { name: 'Иван', phone: '+79251234567', age: 7, comment: 'после 18:00' },
      { toolCallId: 'call-1', messages: [], context: {} },
    );

    expect(notify).toHaveBeenCalledWith({
      name: 'Иван',
      phone: '+79251234567',
      age: 7,
      comment: 'после 18:00',
    });
  });

  it('reports success back to the model', async () => {
    const execute = createApplicationTool(notifier).execute;
    if (!execute) return;

    const result = await execute(
      { name: 'Иван', phone: '+79251234567' },
      { toolCallId: 'call-2', messages: [], context: {} },
    );

    expect(result).toEqual({ success: true, message: 'Заявка отправлена' });
  });

  it('propagates a notifier failure so the model can tell the user', async () => {
    notify.mockRejectedValueOnce(new Error('Telegram API error 403'));
    const execute = createApplicationTool(notifier).execute;
    if (!execute) return;

    await expect(
      execute(
        { name: 'Иван', phone: '+792****4567' },
        { toolCallId: 'call-3', messages: [], context: {} },
      ),
    ).rejects.toThrow('Telegram API error 403');
  });
});
