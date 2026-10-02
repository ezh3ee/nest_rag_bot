import { ChunkerService } from './chunker.service';
import type { Chunk } from './chunker.service';
import type { DocumentStore, StoredDocument } from './document-store.interface';
import { IngestService, isSupportedFileName } from './ingest.service';
import type { DocxParser } from './parsers/docx.parser';
import { ExcelParser } from './parsers/excel.parser';
import type { PdfParser } from './parsers/pdf.parser';
import type { TextParser } from './parsers/text.parser';
import { QdrantService } from '../vector/qdrant.service';

type Options = {
  chunks?: Chunk[];
  failDoneUpdate?: boolean;
  failCleanup?: boolean;
  documentVanishes?: boolean;
};

const buildService = (options: Options = {}) => {
  const state: { current: StoredDocument | null; saved: StoredDocument[] } = {
    current: null,
    saved: [],
  };

  const save = jest.fn().mockImplementation(async (document: StoredDocument) => {
    state.saved.push({ ...document });
    state.current = { ...document };
  });

  const update = jest
    .fn()
    .mockImplementation(async (_id: string, patch: Partial<StoredDocument>) => {
      if (patch.status === 'done' && options.failDoneUpdate) {
        throw new Error('sqlite is down');
      }
      const base = state.current;
      if (base) {
        state.current = { ...base, ...patch };
      }
    });

  const get = jest
    .fn()
    .mockImplementation(async () => (options.documentVanishes ? null : state.current));

  const remove = jest.fn().mockResolvedValue(undefined);
  const addChunks = jest.fn().mockResolvedValue(undefined);
  const deleteByDocument = jest.fn().mockImplementation(async () => {
    if (options.failCleanup) {
      throw new Error('qdrant is down');
    }
  });

  const chunk = jest.fn().mockResolvedValue(options.chunks ?? [{ index: 0, text: 'кусок текста' }]);
  const parse = jest.fn().mockResolvedValue('текст документа');

  const pdfParser: PdfParser = { parse };
  const docxParser: DocxParser = { parse };
  const textParser: TextParser = { parse };
  // У ExcelParser есть приватный extract — объект-литерал такому типу не подходит.
  // Поэтому берём настоящий парсер и подменяем ему метод.
  const excelParser = new ExcelParser();
  jest.spyOn(excelParser, 'parse').mockImplementation(parse);

  const service = new IngestService(
    { chunk } as unknown as ChunkerService,
    { addChunks, deleteByDocument } as unknown as QdrantService,
    { save, update, get, delete: remove } as unknown as DocumentStore,
    pdfParser,
    docxParser,
    textParser,
    excelParser,
  );

  return { service, save, update, get, remove, addChunks, deleteByDocument, chunk, parse, state };
};

const buffer = Buffer.from('что-то');

describe('isSupportedFileName', () => {
  it.each(['doc.pdf', 'doc.docx', 'doc.txt', 'doc.md', 'doc.xlsx', 'doc.xls'])(
    'принимает %s',
    (name) => {
      expect(isSupportedFileName(name)).toBe(true);
    },
  );

  it.each(['archive.zip', 'image.png', 'no-extension'])('отклоняет %s', (name) => {
    expect(isSupportedFileName(name)).toBe(false);
  });
});

describe('IngestService — успешный путь', () => {
  it('сохраняет документ в статусе processing до обработки', async () => {
    const { service, state } = buildService();

    await service.ingest('voin.txt', buffer);

    expect(state.saved).toHaveLength(1);
    expect(state.saved[0].status).toBe('processing');
    expect(state.saved[0].fileName).toBe('voin.txt');
    expect(state.saved[0].fileType).toBe('text');
  });

  it('пишет чанки в векторную базу под id документа', async () => {
    const { service, addChunks } = buildService();

    const result = await service.ingest('voin.txt', buffer);

    expect(addChunks).toHaveBeenCalledWith(result.document.id, 'voin.txt', [
      { index: 0, text: 'кусок текста' },
    ]);
  });

  it('закрывает документ статусом done и числом чанков', async () => {
    const { service, state } = buildService({
      chunks: [
        { index: 0, text: 'раз' },
        { index: 1, text: 'два' },
      ],
    });

    const result = await service.ingest('voin.txt', buffer);

    expect(result.document.status).toBe('done');
    expect(result.document.chunkCount).toBe(2);
    expect(state.current?.status).toBe('done');
  });

  it('разбирает файл парсером по расширению', async () => {
    const { service, parse } = buildService();

    await service.ingest('voin.txt', buffer);

    expect(parse).toHaveBeenCalledWith(buffer);
  });
});

describe('IngestService — отказы', () => {
  it('отклоняет неподдерживаемый формат, ничего не сохраняя', async () => {
    const { service, save, chunk } = buildService();

    await expect(service.ingest('archive.zip', buffer)).rejects.toThrow(/Unsupported file type/);

    expect(save).not.toHaveBeenCalled();
    expect(chunk).not.toHaveBeenCalled();
  });

  it('падает, если из документа не извлекается текст', async () => {
    const { service, addChunks, state } = buildService({ chunks: [] });

    await expect(service.ingest('voin.txt', buffer)).rejects.toThrow(
      'Document contains no extractable text',
    );

    expect(addChunks).not.toHaveBeenCalled();
    expect(state.current?.status).toBe('error');
  });

  it('откатывает чанки, если падение случилось после записи в векторную базу', async () => {
    const { service, deleteByDocument, state } = buildService({ failDoneUpdate: true });

    await expect(service.ingest('voin.txt', buffer)).rejects.toThrow('sqlite is down');

    expect(deleteByDocument).toHaveBeenCalledTimes(1);
    expect(state.current?.status).toBe('error');
    expect(state.current?.errorMessage).toBe('sqlite is down');
  });

  it('не подменяет исходную ошибку, если не удалось и откатить', async () => {
    const { service, deleteByDocument, state } = buildService({
      failDoneUpdate: true,
      failCleanup: true,
    });

    await expect(service.ingest('voin.txt', buffer)).rejects.toThrow('sqlite is down');

    expect(deleteByDocument).toHaveBeenCalledTimes(1);
    expect(state.current?.status).toBe('error');
  });

  it('падает, если документ исчез между обработкой и чтением', async () => {
    const { service } = buildService({ documentVanishes: true });

    await expect(service.ingest('voin.txt', buffer)).rejects.toThrow(/Couldnt update Document/);
  });
});

describe('IngestService — удаление', () => {
  it('удаляет документ из обеих баз', async () => {
    const { service, deleteByDocument, remove } = buildService();
    const ingested = await service.ingest('voin.txt', buffer);

    await service.deleteDocument(ingested.document.id);

    expect(deleteByDocument).toHaveBeenCalledWith(ingested.document.id);
    expect(remove).toHaveBeenCalledWith(ingested.document.id);
  });

  it('сообщает, что документ не найден', async () => {
    const { service, deleteByDocument } = buildService();

    await expect(service.deleteDocument('нет-такого')).rejects.toThrow('нет-такого');

    expect(deleteByDocument).not.toHaveBeenCalled();
  });
});
