export abstract class BaseEmbeddingProvider {
  abstract embed(texts: string[]): Promise<number[][]>;

  async embedWithRetry(texts: string[]): Promise<number[][]> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.embed(texts);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          await this.delay(1000 * attempt);
        }
      }
    }
    throw lastError;
  }

  protected abstract readonly maxRetries: number;

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
