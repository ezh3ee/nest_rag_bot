import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModelV4 } from '@ai-sdk/provider';
import { generateText } from 'ai';
import type { AppConfig } from '../../../../config/app.config';
import type { GenerationOptions } from '../../interfaces/generation-provider.interface';
import { BaseGenerationProvider } from '../../interfaces/generation-provider.interface';

export class GoogleGenerationProvider extends BaseGenerationProvider {
  private readonly model: LanguageModelV4;

  protected readonly maxRetries: number;

  constructor(config: AppConfig, apiKey: string, modelName: string) {
    super();
    this.maxRetries = config.LLM_MAX_RETRIES;
    const client = createGoogleGenerativeAI({ apiKey });
    this.model = client(modelName);
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
