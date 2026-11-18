import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProviderType } from '@scholaris/types';
import { BaseAIProvider } from './base.provider.js';
import { AIExecutionOptions, RawAIResponse, AIProviderError } from '../types.js';

export class GeminiProvider extends BaseAIProvider {
  readonly name: AIProviderType = 'GEMINI';
  readonly defaultModel = 'gemini-1.5-flash';

  private genAI: GoogleGenerativeAI | null = null;
  private readonly modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    super();
    this.modelName = modelName || this.defaultModel;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  isAvailable(): boolean {
    return !!this.genAI;
  }

  async generate(options: AIExecutionOptions): Promise<RawAIResponse> {
    if (!this.genAI) {
      throw new AIProviderError(
        'GEMINI',
        'Google Gemini API key not configured',
        401,
        false
      );
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: options.systemPrompt,
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxTokens ?? 4096,
          responseMimeType: options.schema ? 'application/json' : undefined,
        },
      });

      const contents = options.messages
        ? options.messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }))
        : [{ role: 'user', parts: [{ text: options.prompt }] }];

      const response = await model.generateContent({ contents });
      const responseText = response.response.text();
      const usage = response.response.usageMetadata;

      return {
        rawText: responseText,
        provider: 'GEMINI',
        model: this.modelName,
        promptTokens: usage?.promptTokenCount || 0,
        completionTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0,
      };
    } catch (err: any) {
      const statusCode = err.status || err.statusCode || (err.message?.includes('429') ? 429 : 500);
      const isRetryable = statusCode === 429 || statusCode >= 500;

      throw new AIProviderError(
        'GEMINI',
        err.message || 'Gemini content generation failed',
        statusCode,
        isRetryable,
        err
      );
    }
  }
}
