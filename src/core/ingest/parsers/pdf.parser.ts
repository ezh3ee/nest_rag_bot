import { PDFParse } from 'pdf-parse';
import { DocumentParser } from './parser.interface';

export class PdfParser implements DocumentParser {
  async parse(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
}
