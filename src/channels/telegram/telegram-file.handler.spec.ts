import { fileURLToPath } from 'node:url';
import { IngestService } from '../../core/ingest/ingest.service';
import { appConfigFake, botRecorder, contextStub } from '../../test-utils/fakes';

const ADMIN_CHAT_ID = 111;
const downloadFile = jest.fn();

// undici-fetch напрямую не подменить, поэтому подменяем сам модуль загрузки.
// Путь задаём абсолютным: относительный jest резолвит из своего setup-файла.
const filesModulePath = fileURLToPath(new URL('./telegram-files.ts', import.meta.url));

jest.unstable_mockModule(filesModulePath, () => ({
  downloadTelegramFile: downloadFile,
}));

const { FileHandler } = await import('./telegram-file.handler');

const networkError = () => new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });

const buildHandler = () => {
  const ingest = jest.fn();
  // У IngestService приватные поля, поэтому литерал структурно типу не соответствует:
  // закрываем приведением, как и в остальных спеках (там сервисы тоже подменяются целиком)
  const ingestService = {
    ingest,
    deleteDocument: jest.fn(),
    deleteAll: jest.fn(),
    getDocumentsPage: jest.fn(),
    getDocument: jest.fn(),
  } as unknown as IngestService;
  const handler = new FileHandler(
    ingestService,
    appConfigFake({ TELEGRAM_BOT_TOKEN: 'token', ADMIN_CHAT_ID }),
  );
  const recorder = botRecorder();
  handler.register(recorder.bot);

  return { recorder, ingest };
};

const documentCtx = (overrides: { fileName?: string; fileSize?: number; fromId?: number } = {}) =>
  contextStub({
    chatId: ADMIN_CHAT_ID,
    fromId: overrides.fromId ?? ADMIN_CHAT_ID,
    document: {
      file_name: overrides.fileName ?? 'voin.txt',
      file_id: 'file-1',
      file_size: overrides.fileSize ?? 1024,
    },
  });

const ingested = (chunkCount: number) => ({ document: { chunkCount } });

beforeEach(() => {
  downloadFile.mockReset();
  downloadFile.mockResolvedValue(Buffer.from('содержимое файла'));
});

describe('FileHandler — доступ и валидация', () => {
  it('не пускает не-администратора', async () => {
    const { recorder, ingest } = buildHandler();
    const { ctx, replies } = documentCtx({ fromId: 999 });

    await recorder.runMessage('message:document', ctx);

    expect(replies.join(' ')).toContain('только администратору');
    expect(ingest).not.toHaveBeenCalled();
  });

  it('отказывается от файла больше 20 МБ', async () => {
    const { recorder, ingest } = buildHandler();
    const { ctx, replies } = documentCtx({ fileSize: 21 * 1024 * 1024 });

    await recorder.runMessage('message:document', ctx);

    expect(replies.join(' ')).toContain('слишком большой');
    expect(ingest).not.toHaveBeenCalled();
  });

  it('отказывается от неподдерживаемого формата', async () => {
    const { recorder, ingest } = buildHandler();
    const { ctx, replies } = documentCtx({ fileName: 'archive.zip' });

    await recorder.runMessage('message:document', ctx);

    expect(replies.join(' ')).toContain('Формат не поддерживается');
    expect(ingest).not.toHaveBeenCalled();
  });

  it('подсказывает форматы по команде /learn', async () => {
    const { recorder } = buildHandler();
    const { ctx, replies } = documentCtx();

    await recorder.runCommand('learn', ctx);

    expect(replies.join(' ')).toContain('pdf');
  });
});

describe('FileHandler — успешный ингест', () => {
  it('скармливает файл ингесту и отчитывается числом чанков', async () => {
    const { recorder, ingest } = buildHandler();
    ingest.mockResolvedValue(ingested(3));
    const { ctx, edits } = documentCtx();

    await recorder.runMessage('message:document', ctx);

    expect(ingest).toHaveBeenCalledWith('voin.txt', Buffer.from('содержимое файла'));
    expect(edits.join(' ')).toContain('✅ voin.txt: 3 чанков добавлено');
  });

  it('для документа без имени подставляет имя без расширения — и отклоняет его', async () => {
    // Telegram не всегда присылает file_name. Хендлер генерит `document-<file_id>`,
    // а у такого имени нет расширения, поэтому формат отвергается.
    const { recorder, ingest } = buildHandler();
    const { ctx, replies } = contextStub({
      chatId: ADMIN_CHAT_ID,
      fromId: ADMIN_CHAT_ID,
      document: { file_id: 'file-1', file_size: 1024 },
    });

    await recorder.runMessage('message:document', ctx);

    expect(ingest).not.toHaveBeenCalled();
    expect(replies.join(' ')).toContain('Формат не поддерживается');
  });

  it('не перезапускает ингест, если не удалось отредактировать сообщение об успехе', async () => {
    const { recorder, ingest } = buildHandler();
    ingest.mockResolvedValue(ingested(2));
    const { ctx, replies } = contextStub({
      chatId: ADMIN_CHAT_ID,
      fromId: ADMIN_CHAT_ID,
      document: { file_name: 'voin.txt', file_id: 'file-1', file_size: 1024 },
      failEditOn: (text) => text.startsWith('✅'),
    });

    await recorder.runMessage('message:document', ctx);

    expect(ingest).toHaveBeenCalledTimes(1);
    expect(replies.join(' ')).toContain('✅ voin.txt: 2 чанков добавлено');
  });
});

describe('FileHandler — ошибки и ретраи', () => {
  it('на не-сетевой ошибке не ретраит и сразу сообщает', async () => {
    const { recorder, ingest } = buildHandler();
    ingest.mockRejectedValue(new Error('Document contains no extractable text'));
    const { ctx, edits } = documentCtx();

    await recorder.runMessage('message:document', ctx);

    expect(ingest).toHaveBeenCalledTimes(1);
    expect(edits.join(' ')).toContain('❌ Ошибка загрузки файла');
  });

  it('повторяет сетевые ошибки пять раз и потом честно сообщает о провале', async () => {
    const { recorder, ingest } = buildHandler();
    ingest.mockRejectedValue(networkError());
    const { ctx, edits } = documentCtx();

    await recorder.runMessage('message:document', ctx);

    expect(ingest).toHaveBeenCalledTimes(5);
    expect(edits.join(' ')).toContain('❌ Ошибка загрузки файла');
  });

  it('останавливается на первой удачной попытке', async () => {
    const { recorder, ingest } = buildHandler();
    ingest
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue(ingested(4));
    const { ctx, edits } = documentCtx();

    await recorder.runMessage('message:document', ctx);

    expect(ingest).toHaveBeenCalledTimes(3);
    expect(edits.join(' ')).toContain('✅ voin.txt: 4 чанков добавлено');
  });

  it('падает, если Telegram не отдал путь к файлу', async () => {
    const { recorder, ingest } = buildHandler();
    downloadFile.mockRejectedValue(new Error('Telegram did not return a file path'));
    const { ctx, edits } = documentCtx();

    await recorder.runMessage('message:document', ctx);

    expect(ingest).not.toHaveBeenCalled();
    expect(edits.join(' ')).toContain('❌ Ошибка загрузки файла');
  });
});
