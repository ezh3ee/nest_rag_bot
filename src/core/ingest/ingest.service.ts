import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QdrantService } from '../vector/qdrant.service';
import { ChunkerService } from './chunker.service';
import type { DocumentStore, StoredDocument } from './document-store.interface';
import { DOCUMENT_STORE } from './document-store.interface';
import { DocumentNotFoundError } from './errors';
import { ExcelParser } from './parsers/excel.parser';
import { DocxParser } from './parsers/docx.parser';
import { PdfParser } from './parsers/pdf.parser';
import { TextParser } from './parsers/text.parser';

export interface IngestResult {
  document: StoredDocument;
}

export interface DocumentsPage {
  items: StoredDocument[];
  total: number;
  page: number;
  totalPages: number;
}

type FileType = 'pdf' | 'docx' | 'text' | 'excel';

const PARSER_EXTENSIONS: Record<string, FileType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'docx',
  '.txt': 'text',
  '.md': 'text',
  '.markdown': 'text',
  '.xlsx': 'excel',
  '.xls': 'excel',
};

export function isSupportedFileName(fileName: string): boolean {
  return getExtension(fileName) in PARSER_EXTENSIONS;
}

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx === -1 ? '' : fileName.slice(idx).toLowerCase();
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly chunker: ChunkerService,
    private readonly qdrant: QdrantService,
    @Inject(DOCUMENT_STORE)
    private readonly store: DocumentStore,
    private readonly pdfParser: PdfParser,
    private readonly docxParser: DocxParser,
    private readonly textParser: TextParser,
    private readonly excelParser: ExcelParser,
  ) {}

  async ingest(fileName: string, buffer: Buffer): Promise<IngestResult> {
    const ext = getExtension(fileName);
    const fileType = PARSER_EXTENSIONS[ext];
    if (!fileType) {
      throw new Error(`Unsupported file type: ${ext}. Supported: pdf, docx, txt, md, xlsx`);
    }

    const documentId = randomUUID();
    const document: StoredDocument = {
      id: documentId,
      fileName,
      fileType,
      status: 'processing',
      chunkCount: 0,
      createdAt: new Date(),
    };
    await this.store.save(document);

    try {
      const text = await this.parse(fileType, buffer);
      const chunks = await this.chunker.chunk(text);
      if (chunks.length === 0) {
        throw new Error('Document contains no extractable text');
      }

      await this.qdrant.addChunks(documentId, fileName, chunks);
      await this.store.update(documentId, { status: 'done', chunkCount: chunks.length });
      this.logger.log(`Ingested "${fileName}" (${chunks.length} chunks)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.store.update(documentId, { status: 'error', errorMessage: message });
      this.logger.error(`Ingest failed for "${fileName}": ${message}`);
      throw error;
    }

    const updated = await this.store.get(documentId);
    return { document: updated! };
  }

  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.store.get(documentId);
    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }
    await this.qdrant.deleteByDocument(documentId);
    await this.store.delete(documentId);
    this.logger.log(`Deleted document ${documentId}`);
  }

  async deleteAll(): Promise<void> {
    await this.qdrant.deleteAllDocuments();
    await this.store.deleteAll();
    this.logger.log('Deleted all documents');
  }

  async getDocumentsPage(page: number, pageSize: number): Promise<DocumentsPage> {
    const total = await this.store.count();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const skip = (safePage - 1) * pageSize;

    const items = await this.store.listPage(skip, pageSize);
    return { items, total, page: safePage, totalPages };
  }

  async getDocument(documentId: string): Promise<StoredDocument | null> {
    return this.store.get(documentId);
  }

  private async parse(fileType: FileType, buffer: Buffer): Promise<string> {
    switch (fileType) {
      case 'pdf':
        return this.pdfParser.parse(buffer);
      case 'docx':
        return this.docxParser.parse(buffer);
      case 'text':
        return this.textParser.parse(buffer);
      case 'excel':
        return this.excelParser.parse(buffer);
    }
  }
}
