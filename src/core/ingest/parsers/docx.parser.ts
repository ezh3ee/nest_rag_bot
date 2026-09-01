import mammoth from 'mammoth';
import { DocumentParser } from './parser.interface';

export class DocxParser implements DocumentParser {
  async parse(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}
