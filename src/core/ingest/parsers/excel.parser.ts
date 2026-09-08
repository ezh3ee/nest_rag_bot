import * as XLSX from 'xlsx';
import { DocumentParser } from './parser.interface';

const COLUMN_SEPARATOR = ' | ';

type RichTextPart = { text?: unknown };

function isRichTextPart(cell: unknown): cell is RichTextPart {
  return typeof cell === 'object' && cell !== null && 'text' in cell;
}

function richTextToText(parts: unknown[]): string {
  return parts
    .map((part) => (isRichTextPart(part) && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return '';
  }
  if (typeof cell === 'object') {
    if (Array.isArray(cell)) {
      return richTextToText(cell).trim();
    }
    if (isRichTextPart(cell) && typeof cell.text === 'string') {
      return cell.text.trim();
    }
    return JSON.stringify(cell);
  }
  if (typeof cell === 'number' || typeof cell === 'string' || typeof cell === 'boolean') {
    return String(cell).trim();
  }
  return JSON.stringify(cell);
}

export class ExcelParser implements DocumentParser {
  parse(buffer: Buffer): Promise<string> {
    const text = this.extract(buffer);
    return Promise.resolve(text);
  }

  private extract(buffer: Buffer): string {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sections: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: false,
      });
      if (rows.length === 0) {
        continue;
      }

      const lines = rows.map((row) => row.map((cell) => cellToText(cell)).join(COLUMN_SEPARATOR));
      sections.push(`## Лист: ${sheetName}\n\n${lines.join('\n')}`);
    }

    const text = sections.join('\n\n');
    if (text.trim().length === 0) {
      throw new Error('Excel file contains no extractable text');
    }
    return text;
  }
}
