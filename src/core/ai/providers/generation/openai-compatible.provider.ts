import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV4 } from '@ai-sdk/provider';
import { generateText } from 'ai';
import type { OllamaConfig, OpenAILikeConfig } from '../../../../config/llm.schema';
import type { GenerationOptions } from '../../interfaces/generation-provider.interface';
import { BaseGenerationProvider } from '../../interfaces/generation-provider.interface';

type OpenAICompatibleConfig = OpenAILikeConfig | OllamaConfig;

export class OpenAICompatibleGenerationProvider extends BaseGenerationProvider {
  private readonly model: LanguageModelV4;

  protected readonly maxRetries: number;

  constructor(cfg: OpenAICompatibleConfig, maxRetries: number) {
    super();
    this.maxRetries = maxRetries;
    const client = createOpenAI({
      baseURL: cfg.baseUrl,
      apiKey: 'apiKey' in cfg && cfg.apiKey.length > 0 ? cfg.apiKey : 'not-provided',
    });
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
