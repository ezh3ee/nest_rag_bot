import * as XLSX from 'xlsx';
import { ExcelParser } from '../core/ingest/parsers/excel.parser';
import { ChunkerService } from '../core/ingest/chunker.service';

async function main(): Promise<void> {
  const parser = new ExcelParser();
  const chunker = new ChunkerService();

  // Лист с данными: числа, кириллица, формула.
  // Формула задаётся с кэшем v — реальные xlsx от Excel всегда содержат кэш
  // последнего вычисления в <v>, и именно его отдаёт sheet_to_json({ raw: false }).
  const dataSheet = XLSX.utils.aoa_to_sheet([
    ['Месяц', 'Выручка', 'Расходы'],
    ['Июль', 1000, 800],
    ['Август', 1200, 850],
    ['Среднее', { f: '(B2+B3)/2', v: 1100 }, 825],
  ]);

  // Пустой лист — должен быть пропущен
  const emptySheet = XLSX.utils.aoa_to_sheet([]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Отчёт Q3');
  XLSX.utils.book_append_sheet(workbook, emptySheet, 'Пустой');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const text = await parser.parse(buffer);
  console.log('=== EXTRACTED TEXT ===');
  console.log(text);

  if (!text.includes('## Лист: Отчёт Q3')) {
    throw new Error('FAIL: data sheet header missing');
  }
  if (!text.includes('Месяц | Выручка | Расходы')) {
    throw new Error('FAIL: header row missing');
  }
  if (!text.includes('1100')) {
    throw new Error('FAIL: formula cached value missing');
  }
  if (!text.includes('1000')) {
    throw new Error('FAIL: numbers missing');
  }
  if (text.includes('## Лист: Пустой')) {
    throw new Error('FAIL: empty sheet was not skipped');
  }

  // Файл без текста вообще — должен кинуть ошибку
  const emptyWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(emptyWorkbook, XLSX.utils.aoa_to_sheet([]), 'blank');
  const emptyBuffer = XLSX.write(emptyWorkbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  try {
    await parser.parse(emptyBuffer);
    throw new Error('FAIL: empty workbook did not throw');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('no extractable text')) {
      throw error;
    }
    console.log('empty workbook correctly rejected');
  }

  const chunks = await chunker.chunk(text);
  console.log(`\n=== CHUNKS: ${chunks.length} ===`);
  for (const chunk of chunks) {
    console.log(`--- chunk ${chunk.index} (${chunk.text.length} chars) ---`);
    console.log(chunk.text.slice(0, 200));
  }

  console.log('\nALL CHECKS PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
