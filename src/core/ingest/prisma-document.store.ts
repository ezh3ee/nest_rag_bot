import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { DocumentStatus, DocumentStore, StoredDocument } from './document-store.interface';

@Injectable()
export class PrismaDocumentStore implements DocumentStore {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async save(document: StoredDocument): Promise<void> {
    await this.prisma.document.create({
      data: {
        id: document.id,
        fileName: document.fileName,
        fileType: document.fileType,
        status: document.status,
        chunkCount: document.chunkCount,
        errorMessage: document.errorMessage ?? null,
        createdAt: document.createdAt,
      },
    });
  }

  async get(id: string): Promise<StoredDocument | null> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    return doc ? this.toStored(doc) : null;
  }

  async listPage(skip: number, take: number): Promise<StoredDocument[]> {
    const docs = await this.prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return docs.map((doc) => this.toStored(doc));
  }

  async count(): Promise<number> {
    return this.prisma.document.count();
  }

  async update(id: string, patch: Partial<Omit<StoredDocument, 'id'>>): Promise<void> {
    await this.prisma.document.update({
      where: { id },
      data: {
        status: patch.status,
        chunkCount: patch.chunkCount,
        errorMessage: patch.errorMessage ?? null,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.document.delete({ where: { id } });
  }

  private toStored(doc: {
    id: string;
    fileName: string;
    fileType: string;
    status: string;
    chunkCount: number;
    errorMessage: string | null;
    createdAt: Date;
  }): StoredDocument {
    return {
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      status: doc.status as DocumentStatus,
      chunkCount: doc.chunkCount,
      errorMessage: doc.errorMessage ?? undefined,
      createdAt: doc.createdAt,
    };
  }
}
