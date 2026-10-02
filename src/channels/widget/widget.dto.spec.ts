import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WidgetMessageDto } from './widget.dto';

const validateDto = async (payload: Record<string, unknown>): Promise<string[]> => {
  const instance = plainToInstance(WidgetMessageDto, payload);
  const errors = await validate(instance);
  return errors.map((error) => error.property);
};

describe('WidgetMessageDto', () => {
  it('accepts a message together with a chat id', async () => {
    const invalid = await validateDto({ message: 'Здравствуйте!', chatId: 'widget-session-1' });

    expect(invalid).toEqual([]);
  });

  it('rejects a missing chat id', async () => {
    const invalid = await validateDto({ message: 'Здравствуйте!' });

    expect(invalid).toContain('chatId');
  });

  it('rejects an empty chat id', async () => {
    const invalid = await validateDto({ message: 'Здравствуйте!', chatId: '' });

    expect(invalid).toContain('chatId');
  });

  it('rejects an empty message', async () => {
    const invalid = await validateDto({ message: '', chatId: 'widget-session-1' });

    expect(invalid).toContain('message');
  });

  it('rejects a message longer than 2000 characters', async () => {
    const invalid = await validateDto({
      message: 'а'.repeat(2001),
      chatId: 'widget-session-1',
    });

    expect(invalid).toContain('message');
  });

  it('rejects non-string values', async () => {
    const invalid = await validateDto({ message: 42, chatId: 7 });

    expect(invalid).toEqual(expect.arrayContaining(['message', 'chatId']));
  });
});
