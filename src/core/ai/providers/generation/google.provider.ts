import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModelV4 } from '@ai-sdk/provider';
import { generateText } from 'ai';
import type { GoogleConfig } from '../../../../config/llm.schema';
import type { GenerationOptions } from '../../interfaces/generation-provider.interface';
import { BaseGenerationProvider } from '../../interfaces/generation-provider.interface';

export class GoogleGenerationProvider extends BaseGenerationProvider {
  private readonly model: LanguageModelV4;

  protected readonly maxRetries: number;

  constructor(cfg: GoogleConfig, maxRetries: number) {
    super();
    this.maxRetries = maxRetries;
    const client = createGoogleGenerativeAI({ apiKey: cfg.apiKey });
    this.model = client(cfg.model);
  }

  async generate(system: string, message: string, options?: GenerationOptions): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      system,
      prompt: message,
      tools: options?.tools,
    });
    return text;
  }
}
