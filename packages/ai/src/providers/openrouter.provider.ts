import { AIProviderType } from '@scholaris/types';
import { BaseAIProvider } from './base.provider.js';
import { AIExecutionOptions, RawAIResponse, AIProviderError } from '../types.js';

export class OpenRouterProvider extends BaseAIProvider {
  readonly name: AIProviderType = 'OPENROUTER';
  readonly defaultModel = 'meta-llama/llama-3.3-70b-instruct';

  private readonly apiKey?: string;
  private readonly modelName: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(apiKey?: string, modelName?: string) {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName || this.defaultModel;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(options: AIExecutionOptions): Promise<RawAIResponse> {
    if (!this.apiKey) {
      throw new AIProviderError(
        'OPENROUTER',
        'OpenRouter API key not configured',
        401,
        false
      );
    }

    const messages = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    if (options.messages && options.messages.length > 0) {
      messages.push(...options.messages);
    } else {
      messages.push({
        role: 'user',
        content: options.prompt,
      });
    }

    const payload: Record<string, unknown> = {
      model: this.modelName,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.schema) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://scholaris.app',
          'X-Title': 'Scholaris Academic Assistant',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const statusCode = response.status;
        const isRetryable = statusCode === 429 || statusCode >= 500;

        throw new AIProviderError(
          'OPENROUTER',
          `OpenRouter API error (${statusCode}): ${errorText}`,
          statusCode,
          isRetryable
        );
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };
      const choice = json.choices?.[0];

      if (!choice || !choice.message?.content) {
        throw new AIProviderError(
          'OPENROUTER',
          'OpenRouter returned an empty candidate response',
          500,
          true
        );
      }

      const usage = json.usage;

      return {
        rawText: choice.message.content,
        provider: 'OPENROUTER',
        model: this.modelName,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      };
    } catch (err: any) {
      if (err instanceof AIProviderError) {
        throw err;
      }
      throw new AIProviderError(
        'OPENROUTER',
        err.message || 'Network error communicating with OpenRouter',
        0,
        true,
        err
      );
    }
  }
}
