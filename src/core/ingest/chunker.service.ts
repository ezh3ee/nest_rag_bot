import { Injectable } from '@nestjs/common';

export interface Chunk {
  index: number;
  text: string;
}

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

@Injectable()
export class ChunkerService {
  chunk(text: string): Chunk[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (normalized.length === 0) {
      return [];
    }
    const paragraphs = normalized.split(/\n{2,}/);
    const chunks: Chunk[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
      const pieces = this.splitOversized(paragraph.trim());
      for (const piece of pieces) {
        if (current.length > 0 && current.length + piece.length + 2 > CHUNK_SIZE) {
          chunks.push({ index: chunks.length, text: current.trim() });
          current = this.overlapTail(current);
        }
        current = current.length > 0 ? `${current}\n\n${piece}` : piece;
      }
    }
    if (current.trim().length > 0) {
      chunks.push({ index: chunks.length, text: current.trim() });
    }
    return chunks;
  }

  private splitOversized(paragraph: string): string[] {
    if (paragraph.length <= CHUNK_SIZE) {
      return [paragraph];
    }
    const sentences = paragraph.split(/(?<=[.!?…])\s+/);
    const pieces: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      if (sentence.length > CHUNK_SIZE) {
        if (current.length > 0) {
          pieces.push(current);
          current = '';
        }
        for (let i = 0; i < sentence.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
          pieces.push(sentence.slice(i, i + CHUNK_SIZE));
        }
        continue;
      }
      if (current.length > 0 && current.length + sentence.length + 1 > CHUNK_SIZE) {
        pieces.push(current);
        current = '';
      }
      current = current.length > 0 ? `${current} ${sentence}` : sentence;
    }
    if (current.length > 0) {
      pieces.push(current);
    }
    return pieces;
  }

  private overlapTail(text: string): string {
    if (text.length <= CHUNK_OVERLAP) {
      return text;
    }
    return text.slice(text.length - CHUNK_OVERLAP);
  }
}
