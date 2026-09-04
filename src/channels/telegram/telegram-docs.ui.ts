import { InlineKeyboard } from 'grammy';
import type { StoredDocument } from '../../core/ingest/document-store.interface';
import type { DocumentsPage } from '../../core/ingest/ingest.service';

export const PAGE_SIZE = 10;
const MAX_BUTTON_TEXT = 48;
const MAX_TG_MESSAGE = 4000;

export const CB_DOCS_PAGE = 'docs:p';
export const CB_DOCS_VIEW = 'docs:v';
export const CB_DOCS_DELETE = 'docs:d';
export const CB_DOCS_CONFIRM = 'docs:c';

export interface DocsCallback {
  action: 'page' | 'view' | 'delete' | 'confirm';
  documentId: string;
  offset: number;
}

export function parseDocsCallback(data: string): DocsCallback | null {
  const parts = data.split(':');
  if (parts.length < 2 || parts[0] !== 'docs') {
    return null;
  }
  const action = parts[1];
  if (action === 'page') {
    const offset = Number(parts[2]);
    if (!Number.isInteger(offset) || offset < 0) {
      return null;
    }
    return { action: 'page', documentId: '', offset };
  }
  if (action === 'view' || action === 'delete' || action === 'confirm') {
    const documentId = parts[2] ?? '';
    const offset = Number(parts[3] ?? 0);
    if (!documentId || !Number.isInteger(offset) || offset < 0) {
      return null;
    }
    return { action, documentId, offset };
  }
  return null;
}

export function statusIcon(status: string): string {
  if (status === 'done') return '✅';
  if (status === 'error') return '❌';
  return '⏳';
}

function truncate(text: string, max = MAX_BUTTON_TEXT): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function docsListText(page: DocumentsPage): string {
  if (page.total === 0) {
    return 'Документов пока нет. Отправь файл для обучения.';
  }
  const from = (page.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page.page * PAGE_SIZE, page.total);
  return `📚 Документы: ${from}–${to} из ${page.total} · страница ${page.page}/${page.totalPages}`;
}

export function buildDocsListKeyboard(
  page: DocumentsPage,
  offsetOf: (page: number) => number,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const doc of page.items) {
    kb.text(
      `${statusIcon(doc.status)} ${truncate(doc.fileName)}`,
      `docs:v:${doc.id}:${offsetOf(page.page)}`,
    ).row();
  }
  if (page.totalPages > 1) {
    if (page.page > 1) {
      kb.text('⬅️', `docs:p:${offsetOf(page.page - 1)}`);
    }
    kb.text(`${page.page}/${page.totalPages}`, 'docs:noop');
    if (page.page < page.totalPages) {
      kb.text('➡️', `docs:p:${offsetOf(page.page + 1)}`);
    }
  }
  return kb;
}

export function docDetailText(doc: StoredDocument): string {
  const created = doc.createdAt.toLocaleString('ru-RU');
  const err = doc.errorMessage ? `\nОшибка: ${doc.errorMessage}` : '';
  return [
    `📄 ${doc.fileName}`,
    `Тип: ${doc.fileType}`,
    `Статус: ${statusIcon(doc.status)} ${doc.status}`,
    `Чанков: ${doc.chunkCount}`,
    `Загружен: ${created}`,
    `ID: ${doc.id}${err}`,
  ].join('\n');
}

export function buildDocDetailKeyboard(documentId: string, backOffset: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text('🗑 Удалить', `docs:d:${documentId}:${backOffset}`);
  kb.text('⬅️ Назад', `docs:p:${backOffset}`);
  return kb;
}

export function buildConfirmDeleteKeyboard(documentId: string, backOffset: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text('🔥 Да, удалить', `docs:c:${documentId}:${backOffset}`);
  kb.text('Отмена', `docs:v:${documentId}:${backOffset}`);
  return kb;
}

export function deletedText(fileName: string): string {
  return `🗑 Документ «${truncate(fileName)}» удалён.`;
}

export { MAX_TG_MESSAGE };
