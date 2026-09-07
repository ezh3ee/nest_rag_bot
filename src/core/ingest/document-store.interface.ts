export const DocumentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
} as const;

export interface StoredDocument {
  id: string;
  fileName: string;
  fileType: string;
  status: (typeof DocumentStatus)[keyof typeof DocumentStatus];
  chunkCount: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface DocumentStore {
  save(document: StoredDocument): Promise<void>;
  get(id: string): Promise<StoredDocument | null>;
  listPage(skip: number, take: number): Promise<StoredDocument[]>;
  count(): Promise<number>;
  update(id: string, patch: Partial<Omit<StoredDocument, 'id'>>): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

export const DOCUMENT_STORE = Symbol('DOCUMENT_STORE');
