import { AIProviderType } from '@scholaris/types';
import { AIExecutionOptions, RawAIResponse } from '../types.js';

export abstract class BaseAIProvider {
  abstract readonly name: AIProviderType;
  abstract readonly defaultModel: string;

  abstract isAvailable(): boolean;

  abstract generate(options: AIExecutionOptions): Promise<RawAIResponse>;
}
