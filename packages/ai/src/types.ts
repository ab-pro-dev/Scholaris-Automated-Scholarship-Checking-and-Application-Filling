import { z } from 'zod';
import { AIProviderType, AITaskType } from '@scholaris/types';

export interface AIServiceConfig {
  geminiApiKey?: string;
  geminiModel?: string; // Default: 'gemini-1.5-flash'
  openRouterApiKey?: string;
  openRouterModel?: string; // Default: 'meta-llama/llama-3.3-70b-instruct'
  timeoutMs?: number; // Default: 30000ms
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIExecutionOptions<T = unknown> {
  taskType: AITaskType;
  prompt: string;
  systemPrompt?: string;
  messages?: PromptMessage[];
  schema?: z.ZodSchema<T>;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  preferredProvider?: AIProviderType;
  /**
   * If true, automatically anonymizes sensitive PII (emails, phone, IDs, passports) before calling LLM.
   */
  anonymize?: boolean;
  /**
   * Optional custom replacement map for anonymization (e.g. { "Abebe Bikila": "[STUDENT_NAME]" })
   */
  customPIIReplacements?: Record<string, string>;
}

export interface RawAIResponse {
  rawText: string;
  provider: AIProviderType;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIExecutionResult<T = unknown> {
  data: T;
  rawText: string;
  provider: AIProviderType;
  model: string;
  taskType: AITaskType;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  isFallback: boolean;
  costEstimate?: number;
}

export class AIProviderError extends Error {
  constructor(
    public readonly provider: AIProviderType,
    message: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = true,
    public readonly originalError?: unknown
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AIProviderError';
  }
}

export class AISchemaValidationError extends Error {
  constructor(message: string, public readonly zodErrors?: unknown) {
    super(`AI Output Schema Validation Failed: ${message}`);
    this.name = 'AISchemaValidationError';
  }
}
