import { Injectable } from '@nestjs/common';
import type { DocumentStore } from './document-store.interface';
import type { StoredDocument } from './document-store.interface';

@Injectable()
export class InMemoryDocumentStore implements DocumentStore {
  private readonly documents = new Map<string, StoredDocument>();

  save(document: StoredDocument): Promise<void> {
    this.documents.set(document.id, document);
    return Promise.resolve();
  }

  get(id: string): Promise<StoredDocument | null> {
    return Promise.resolve(this.documents.get(id) ?? null);
  }

  list(): Promise<StoredDocument[]> {
    const sorted = [...this.documents.values()].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    return Promise.resolve(sorted);
  }

  update(id: string, patch: Partial<Omit<StoredDocument, 'id'>>): Promise<void> {
    const existing = this.documents.get(id);
    if (existing) {
      this.documents.set(id, { ...existing, ...patch });
    }
    return Promise.resolve();
  }
}
