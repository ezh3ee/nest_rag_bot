import type { ToolSet } from 'ai';

export interface GenerationOptions {
  tools?: ToolSet;
}

export abstract class BaseGenerationProvider {
  abstract generate(system: string, message: string, options?: GenerationOptions): Promise<string>;

  async generateWithRetry(
    system: string,
    message: string,
    options?: GenerationOptions,
  ): Promise<string> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.generate(system, message, options);
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
