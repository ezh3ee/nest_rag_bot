import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface Chunk {
  index: number;
  text: string;
}

@Injectable()
export class ChunkerService {
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });

  async chunk(text: string): Promise<Chunk[]> {
    const texts = await this.splitter.splitText(text);
    return texts.map((textItem, index) => ({ index, text: textItem }));
  }
}
