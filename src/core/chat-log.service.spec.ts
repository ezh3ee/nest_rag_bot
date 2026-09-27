import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigType } from '@nestjs/config';
import appConfig from '../config/app.config';
import { ChatLogService } from './chat-log.service';

const todayFile = (dir: string): string =>
  join(dir, `chat-${new Date().toISOString().slice(0, 10)}.jsonl`);

const buildService = (dir: string): ChatLogService =>
  new ChatLogService({ CHAT_LOG_DIR: dir } as unknown as ConfigType<typeof appConfig>);

describe('ChatLogService', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'chat-log-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes one JSON line per exchange', async () => {
    const service = buildService(dir);

    await service.write('сколько стоит?', 'позвоните нам');

    const lines = (await readFile(todayFile(dir), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]) as { timestamp: string; question: string; answer: string };
    expect(entry.question).toBe('сколько стоит?');
    expect(entry.answer).toBe('позвоните нам');
    expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
  });

  it('appends further exchanges to the same daily file', async () => {
    const service = buildService(dir);

    await service.write('первый', 'ответ 1');
    await service.write('второй', 'ответ 2');

    const lines = (await readFile(todayFile(dir), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1])).toMatchObject({ question: 'второй', answer: 'ответ 2' });
  });

  it('creates missing nested directories', async () => {
    const nested = join(dir, 'a', 'b', 'logs');
    const service = buildService(nested);

    await service.write('вопрос', 'ответ');

    const lines = (await readFile(todayFile(nested), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(1);
  });

  it('keeps writes in order when called concurrently', async () => {
    const service = buildService(dir);

    void service.write('раз', 'один');
    void service.write('два', 'два');
    void service.write('три', 'три');
    await service.beforeApplicationShutdown();

    const lines = (await readFile(todayFile(dir), 'utf8')).trim().split('\n');
    expect(lines.map((line) => (JSON.parse(line) as { question: string }).question)).toEqual([
      'раз',
      'два',
      'три',
    ]);
  });

  it('does not reject when the target path cannot be used as a directory', async () => {
    const filePath = join(dir, 'not-a-directory');
    await writeFile(filePath, 'x', 'utf8');
    const service = buildService(filePath);

    await expect(service.write('вопрос', 'ответ')).resolves.toBeUndefined();
  });
});
