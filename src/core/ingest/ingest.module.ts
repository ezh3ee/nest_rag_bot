import { Module } from '@nestjs/common';
import { ChunkerService } from './chunker.service';
import { DOCUMENT_STORE } from './document-store.interface';
import { InMemoryDocumentStore } from './in-memory-document.store';
import { IngestService } from './ingest.service';
import { DocxParser } from './parsers/docx.parser';
import { PdfParser } from './parsers/pdf.parser';
import { TextParser } from './parsers/text.parser';

@Module({
  providers: [
    ChunkerService,
    IngestService,
    DocxParser,
    PdfParser,
    TextParser,
    { provide: DOCUMENT_STORE, useClass: InMemoryDocumentStore },
  ],
  exports: [IngestService],
})
export class IngestModule {}
