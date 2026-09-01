import { DocumentParser } from './parser.interface';

export class TextParser implements DocumentParser {
  parse(buffer: Buffer): Promise<string> {
    return Promise.resolve(buffer.toString('utf-8'));
  }
}
