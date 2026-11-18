import { z } from 'zod';
import { AIProviderType } from '@scholaris/types';
import { BaseAIProvider } from './providers/base.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenRouterProvider } from './providers/openrouter.provider.js';
import { anonymizePII, deAnonymizePII } from './anonymizer.js';
import {
  AIServiceConfig,
  AIExecutionOptions,
  AIExecutionResult,
  RawAIResponse,
  AIProviderError,
  AISchemaValidationError,
} from './types.js';

export class AIService {
  private primaryProvider: BaseAIProvider;
  private fallbackProvider: BaseAIProvider;

  constructor(
    config: AIServiceConfig = {},
    customPrimary?: BaseAIProvider,
    customFallback?: BaseAIProvider
  ) {
    this.primaryProvider =
      customPrimary ||
      new GeminiProvider(config.geminiApiKey, config.geminiModel);

    this.fallbackProvider =
      customFallback ||
      new OpenRouterProvider(config.openRouterApiKey, config.openRouterModel);
  }

  /**
   * Generates type-safe structured data validated against a Zod schema.
   * Seamlessly handles primary -> fallback provider failover.
   */
  async generateStructuredOutput<T>(
    options: AIExecutionOptions<T>
  ): Promise<AIExecutionResult<T>> {
    if (!options.schema) {
      throw new Error('generateStructuredOutput requires a valid Zod schema in options.schema');
    }

    let prompt = options.prompt;
    let systemPrompt = options.systemPrompt;
    let piiMapping: Record<string, string> = {};

    if (options.anonymize) {
      const anonPrompt = anonymizePII(prompt, {
        customReplacements: options.customPIIReplacements,
      });
      prompt = anonPrompt.anonymizedText;
      piiMapping = { ...anonPrompt.mapping };

      if (systemPrompt) {
        const anonSys = anonymizePII(systemPrompt, {
          customReplacements: options.customPIIReplacements,
        });
        systemPrompt = anonSys.anonymizedText;
        piiMapping = { ...piiMapping, ...anonSys.mapping };
      }
    }

    // Enhance prompt to mandate strict JSON output without markdown wrapper if supported
    const enhancedOptions: AIExecutionOptions<T> = {
      ...options,
      prompt,
      systemPrompt: `${systemPrompt || ''}\nIMPORTANT: You must respond ONLY with a raw valid JSON object matching the requested schema. Do not enclose in markdown blocks.`.trim(),
    };

    const startTime = Date.now();
    const { rawResponse, isFallback } = await this.executeWithFailover(enhancedOptions);
    const latencyMs = Date.now() - startTime;

    // Restore PII placeholders if anonymization was used
    let processedRawText = rawResponse.rawText;
    if (options.anonymize && Object.keys(piiMapping).length > 0) {
      processedRawText = deAnonymizePII(processedRawText, piiMapping);
    }

    // Parse and validate against Zod schema
    const parsedData = this.parseAndValidateSchema(processedRawText, options.schema);

    return {
      data: parsedData,
      rawText: processedRawText,
      provider: rawResponse.provider,
      model: rawResponse.model,
      taskType: options.taskType,
      latencyMs,
      promptTokens: rawResponse.promptTokens,
      completionTokens: rawResponse.completionTokens,
      totalTokens: rawResponse.totalTokens,
      isFallback,
    };
  }

  /**
   * Generates free-form plain text responses with failover support.
   */
  async generateText(
    options: AIExecutionOptions
  ): Promise<AIExecutionResult<string>> {
    let prompt = options.prompt;
    let systemPrompt = options.systemPrompt;
    let piiMapping: Record<string, string> = {};

    if (options.anonymize) {
      const anonPrompt = anonymizePII(prompt, {
        customReplacements: options.customPIIReplacements,
      });
      prompt = anonPrompt.anonymizedText;
      piiMapping = { ...anonPrompt.mapping };

      if (systemPrompt) {
        const anonSys = anonymizePII(systemPrompt, {
          customReplacements: options.customPIIReplacements,
        });
        systemPrompt = anonSys.anonymizedText;
        piiMapping = { ...piiMapping, ...anonSys.mapping };
      }
    }

    const enhancedOptions: AIExecutionOptions = {
      ...options,
      prompt,
      systemPrompt,
    };

    const startTime = Date.now();
    const { rawResponse, isFallback } = await this.executeWithFailover(enhancedOptions);
    const latencyMs = Date.now() - startTime;

    let processedRawText = rawResponse.rawText;
    if (options.anonymize && Object.keys(piiMapping).length > 0) {
      processedRawText = deAnonymizePII(processedRawText, piiMapping);
    }

    return {
      data: processedRawText,
      rawText: processedRawText,
      provider: rawResponse.provider,
      model: rawResponse.model,
      taskType: options.taskType,
      latencyMs,
      promptTokens: rawResponse.promptTokens,
      completionTokens: rawResponse.completionTokens,
      totalTokens: rawResponse.totalTokens,
      isFallback,
    };
  }

  /**
   * Internal failover executor: Tries primary provider, falls back to secondary on failure.
   */
  private async executeWithFailover(
    options: AIExecutionOptions
  ): Promise<{ rawResponse: RawAIResponse; isFallback: boolean }> {
    const primary =
      options.preferredProvider === 'OPENROUTER'
        ? this.fallbackProvider
        : this.primaryProvider;

    const fallback =
      options.preferredProvider === 'OPENROUTER'
        ? this.primaryProvider
        : this.fallbackProvider;

    // Attempt Primary Provider
    if (primary.isAvailable()) {
      try {
        const rawResponse = await primary.generate(options);
        return { rawResponse, isFallback: false };
      } catch (err: any) {
        console.warn(
          `Primary AI provider [${primary.name}] failed: ${err.message}. Initiating fallback to [${fallback.name}].`
        );
      }
    } else {
      console.warn(
        `Primary AI provider [${primary.name}] is not configured. Falling back to [${fallback.name}].`
      );
    }

    // Attempt Fallback Provider
    if (fallback.isAvailable()) {
      try {
        const rawResponse = await fallback.generate(options);
        return { rawResponse, isFallback: true };
      } catch (err: any) {
        throw new AIProviderError(
          fallback.name,
          `Both primary and fallback AI providers failed. Fallback error: ${err.message}`,
          err.statusCode,
          false,
          err
        );
      }
    }

    throw new AIProviderError(
      primary.name,
      'No AI providers are available or configured with valid API keys.',
      503,
      false
    );
  }

  /**
   * Cleans potential markdown fencing and parses JSON against the given Zod schema.
   */
  private parseAndValidateSchema<T>(rawText: string, schema: z.ZodSchema<T>): T {
    let cleanJson = rawText.trim();

    // Strip markdown JSON fencing if present
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    cleanJson = cleanJson.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr: any) {
      throw new AISchemaValidationError(
        `Response could not be parsed as JSON: ${parseErr.message}\nRaw Content:\n${rawText}`
      );
    }

    const validation = schema.safeParse(parsed);
    if (!validation.success) {
      throw new AISchemaValidationError(
        validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
        validation.error.flatten()
      );
    }

    return validation.data;
  }
}
