import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EmbeddingService } from '../ai/embedding.service';
import { QdrantService } from '../vector/qdrant.service';
import { ChunkerService } from './chunker.service';
import { DOCUMENT_STORE } from './document-store.interface';
import type { DocumentStore } from './document-store.interface';
import type { StoredDocument } from './document-store.interface';
import { DocxParser } from './parsers/docx.parser';
import { PdfParser } from './parsers/pdf.parser';
import { TextParser } from './parsers/text.parser';

export interface IngestResult {
  document: StoredDocument;
}

const PARSER_EXTENSIONS: Record<string, 'pdf' | 'docx' | 'text'> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'docx',
  '.txt': 'text',
  '.md': 'text',
  '.markdown': 'text',
};

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly chunker: ChunkerService,
    private readonly embedding: EmbeddingService,
    private readonly qdrant: QdrantService,
    @Inject(DOCUMENT_STORE)
    private readonly store: DocumentStore,
    private readonly pdfParser: PdfParser,
    private readonly docxParser: DocxParser,
    private readonly textParser: TextParser,
  ) {}

  async ingest(fileName: string, buffer: Buffer): Promise<IngestResult> {
    const ext = this.extensionOf(fileName);
    const fileType = PARSER_EXTENSIONS[ext];
    if (!fileType) {
      throw new Error(`Unsupported file type: ${ext}. Supported: pdf, docx, txt, md`);
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
      const chunks = this.chunker.chunk(text);
      if (chunks.length === 0) {
        throw new Error('Document contains no extractable text');
      }

      const vectors = await this.embedding.embed(chunks.map((c) => c.text));
      await this.qdrant.upsert(
        chunks.map((chunk, i) => ({
          id: randomUUID(),
          vector: vectors[i] ?? [],
          payload: {
            documentId,
            chunkIndex: chunk.index,
            text: chunk.text,
            fileName,
          },
        })),
      );

      await this.store.update(documentId, { status: 'done', chunkCount: chunks.length });
      this.logger.log(`Ingested "${fileName}" (${chunks.length} chunks)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.store.update(documentId, { status: 'error', errorMessage: message });
      this.logger.error(`Ingest failed for "${fileName}": ${message}`);
      throw error;
    }

    const updated = await this.store.get(documentId);
    if (!updated) {
      throw new Error('Document disappeared during ingest');
    }
    return { document: updated };
  }

  async deleteDocument(documentId: string): Promise<void> {
    const points = await this.qdrant.scrollAll();
    const toDelete = points.filter((p) => p.payload['documentId'] === documentId);
    await this.qdrant.deletePoints(toDelete.map((p) => p.id));
    this.logger.log(`Deleted document ${documentId} (${toDelete.length} chunks)`);
  }

  async listDocuments(): Promise<StoredDocument[]> {
    return this.store.list();
  }

  private async parse(fileType: 'pdf' | 'docx' | 'text', buffer: Buffer): Promise<string> {
    switch (fileType) {
      case 'pdf':
        return this.pdfParser.parse(buffer);
      case 'docx':
        return this.docxParser.parse(buffer);
      case 'text':
        return this.textParser.parse(buffer);
    }
  }

  private extensionOf(fileName: string): string {
    const idx = fileName.lastIndexOf('.');
    return idx === -1 ? '' : fileName.slice(idx).toLowerCase();
  }
}
