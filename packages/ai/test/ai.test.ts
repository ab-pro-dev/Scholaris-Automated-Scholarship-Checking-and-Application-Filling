import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { BaseAIProvider } from '../src/providers/base.provider.js';
import { AIService } from '../src/ai.service.js';
import { anonymizePII, deAnonymizePII } from '../src/anonymizer.js';
import {
  AIProviderError,
  AISchemaValidationError,
  AIExecutionOptions,
  RawAIResponse,
} from '../src/types.js';

// Test Schema
const testScholarshipSchema = z.object({
  isLegitimate: z.boolean(),
  verificationScore: z.number().min(0).max(100),
  summary: z.string().min(1),
  flags: z.array(z.string()),
});

type TestScholarship = z.infer<typeof testScholarshipSchema>;

// Mock Providers for deterministic testing
class MockTestProvider extends BaseAIProvider {
  constructor(
    readonly name: 'GEMINI' | 'OPENROUTER',
    readonly defaultModel: string,
    private available: boolean = true,
    private mockResponse?: string,
    private shouldFail: boolean = false,
    private failError?: Error
  ) {
    super();
  }

  isAvailable(): boolean {
    return this.available;
  }

  setMockResponse(text: string) {
    this.mockResponse = text;
  }

  setShouldFail(fail: boolean, error?: Error) {
    this.shouldFail = fail;
    this.failError = error;
  }

  async generate(_options: AIExecutionOptions): Promise<RawAIResponse> {
    if (this.shouldFail) {
      throw (
        this.failError ||
        new AIProviderError(this.name, 'Simulated provider error', 429, true)
      );
    }

    return {
      rawText: this.mockResponse || '{}',
      provider: this.name,
      model: this.defaultModel,
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200,
    };
  }
}

describe('AI Provider Package (@scholaris/ai)', () => {
  it('generateStructuredOutput parses valid JSON matching Zod schema with primary provider', async () => {
    const validJson = JSON.stringify({
      isLegitimate: true,
      verificationScore: 92,
      summary: 'Verified university scholarship',
      flags: [],
    });

    const primary = new MockTestProvider('GEMINI', 'gemini-1.5-flash', true, validJson);
    const fallback = new MockTestProvider('OPENROUTER', 'llama-3.3-70b', true);

    const service = new AIService({}, primary, fallback);

    const result = await service.generateStructuredOutput<TestScholarship>({
      taskType: 'VERIFICATION',
      prompt: 'Verify scholarship at oxford.ac.uk',
      schema: testScholarshipSchema,
    });

    expect(result.data.isLegitimate).toBe(true);
    expect(result.data.verificationScore).toBe(92);
    expect(result.data.summary).toBe('Verified university scholarship');
    expect(result.isFallback).toBe(false);
    expect(result.provider).toBe('GEMINI');
    expect(result.promptTokens).toBe(120);
    expect(result.completionTokens).toBe(80);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('generateStructuredOutput strips markdown json code fencing before parsing', async () => {
    const markdownFencedJson = `\`\`\`json
{
  "isLegitimate": false,
  "verificationScore": 15,
  "summary": "Suspicious domain asking for upfront application fee",
  "flags": ["FEE_REQUIRED", "DOMAIN_MISMATCH"]
}
\`\`\``;

    const primary = new MockTestProvider('GEMINI', 'gemini-1.5-flash', true, markdownFencedJson);
    const fallback = new MockTestProvider('OPENROUTER', 'llama-3.3-70b', true);

    const service = new AIService({}, primary, fallback);

    const result = await service.generateStructuredOutput<TestScholarship>({
      taskType: 'VERIFICATION',
      prompt: 'Check scam scholarship',
      schema: testScholarshipSchema,
    });

    expect(result.data.isLegitimate).toBe(false);
    expect(result.data.verificationScore).toBe(15);
    expect(result.data.flags).toEqual(['FEE_REQUIRED', 'DOMAIN_MISMATCH']);
    expect(result.isFallback).toBe(false);
  });

  it('generateStructuredOutput automatically fails over to fallback provider when primary fails', async () => {
    const primary = new MockTestProvider(
      'GEMINI',
      'gemini-1.5-flash',
      true,
      undefined,
      true,
      new AIProviderError('GEMINI', 'Rate limit exceeded (429)', 429, true)
    );

    const fallbackJson = JSON.stringify({
      isLegitimate: true,
      verificationScore: 88,
      summary: 'Verified via secondary model fallback',
      flags: [],
    });

    const fallback = new MockTestProvider('OPENROUTER', 'llama-3.3-70b', true, fallbackJson);

    const service = new AIService({}, primary, fallback);

    const result = await service.generateStructuredOutput<TestScholarship>({
      taskType: 'VERIFICATION',
      prompt: 'Verify scholarship with failover',
      schema: testScholarshipSchema,
    });

    expect(result.isFallback).toBe(true);
    expect(result.provider).toBe('OPENROUTER');
    expect(result.data.summary).toBe('Verified via secondary model fallback');
  });

  it('generateStructuredOutput falls back when primary is not configured', async () => {
    // Primary has no API key (isAvailable() === false)
    const primary = new MockTestProvider('GEMINI', 'gemini-1.5-flash', false);

    const fallbackJson = JSON.stringify({
      isLegitimate: true,
      verificationScore: 90,
      summary: 'Fallback execution due to unconfigured primary',
      flags: [],
    });

    const fallback = new MockTestProvider('OPENROUTER', 'llama-3.3-70b', true, fallbackJson);

    const service = new AIService({}, primary, fallback);

    const result = await service.generateStructuredOutput<TestScholarship>({
      taskType: 'VERIFICATION',
      prompt: 'Verify scholarship without Gemini key',
      schema: testScholarshipSchema,
    });

    expect(result.isFallback).toBe(true);
    expect(result.provider).toBe('OPENROUTER');
  });

  it('throws AISchemaValidationError when JSON does not conform to Zod schema', async () => {
    // Missing required fields
    const invalidJson = JSON.stringify({
      invalidField: 123,
    });

    const primary = new MockTestProvider('GEMINI', 'gemini-1.5-flash', true, invalidJson);
    const fallback = new MockTestProvider('OPENROUTER', 'llama-3.3-70b', true);

    const service = new AIService({}, primary, fallback);

    await expect(
      service.generateStructuredOutput<TestScholarship>({
        taskType: 'VERIFICATION',
        prompt: 'Invalid JSON test',
        schema: testScholarshipSchema,
      })
    ).rejects.toThrow(AISchemaValidationError);
  });

  it('throws AIProviderError when both primary and fallback fail', async () => {
    const primary = new MockTestProvider(
      'GEMINI',
      'gemini-1.5-flash',
      true,
      undefined,
      true,
      new AIProviderError('GEMINI', 'Gemini down', 500)
    );

    const fallback = new MockTestProvider(
      'OPENROUTER',
      'llama-3.3-70b',
      true,
      undefined,
      true,
      new AIProviderError('OPENROUTER', 'OpenRouter down', 500)
    );

    const service = new AIService({}, primary, fallback);

    await expect(
      service.generateStructuredOutput<TestScholarship>({
        taskType: 'VERIFICATION',
        prompt: 'Total outage test',
        schema: testScholarshipSchema,
      })
    ).rejects.toThrow(AIProviderError);
  });

  it('generateText returns free-form text with latency and token metrics', async () => {
    const textOutput = 'Here is a comprehensive scholarship essay draft tailored to your profile.';

    const primary = new MockTestProvider('GEMINI', 'gemini-1.5-flash', true, textOutput);
    const fallback = new MockTestProvider('OPENROUTER', 'llama-3.3-70b', true);

    const service = new AIService({}, primary, fallback);

    const result = await service.generateText({
      taskType: 'ESSAY_DRAFT',
      prompt: 'Draft scholarship essay',
    });

    expect(result.data).toBe(textOutput);
    expect(result.provider).toBe('GEMINI');
    expect(result.totalTokens).toBe(200);
    expect(result.isFallback).toBe(false);
  });

  it('anonymizePII masks emails, SSNs, phones, and passport numbers', () => {
    const sensitivePrompt =
      'Student Abebe Bikila with email abebe.bikila@example.edu, phone +1-555-432-8765, SSN 123-45-6789, and passport ET9876543 applying for scholarship.';

    const result = anonymizePII(sensitivePrompt, {
      customReplacements: { 'Abebe Bikila': '[STUDENT_NAME]' },
    });

    expect(result.anonymizedText).not.toContain('abebe.bikila@example.edu');
    expect(result.anonymizedText).not.toContain('+1-555-432-8765');
    expect(result.anonymizedText).not.toContain('123-45-6789');
    expect(result.anonymizedText).not.toContain('ET9876543');
    expect(result.anonymizedText).not.toContain('Abebe Bikila');

    expect(result.anonymizedText).toContain('[STUDENT_NAME]');
    expect(result.anonymizedText).toContain('[EMAIL_');
    expect(result.anonymizedText).toContain('[PHONE_');
    expect(result.anonymizedText).toContain('[GOV_ID_');
    expect(result.anonymizedText).toContain('[PASSPORT_NO_');

    const restored = result.restore(result.anonymizedText);
    expect(restored).toContain('abebe.bikila@example.edu');
    expect(restored).toContain('+1-555-432-8765');
    expect(restored).toContain('123-45-6789');
    expect(restored).toContain('ET9876543');
    expect(restored).toContain('Abebe Bikila');
  });

  it('AIService automatically sanitizes prompt when anonymize option is true', async () => {
    let capturedPrompt = '';

    class CapturingProvider extends BaseAIProvider {
      readonly name = 'GEMINI' as const;
      readonly defaultModel = 'gemini-1.5-flash';
      isAvailable() {
        return true;
      }
      async generate(options: AIExecutionOptions): Promise<RawAIResponse> {
        capturedPrompt = options.prompt;
        // Provider echoes back the placeholder in response
        return {
          rawText: `Processed review for student [STUDENT_NAME] with contact [EMAIL_1].`,
          provider: 'GEMINI',
          model: 'gemini-1.5-flash',
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        };
      }
    }

    const provider = new CapturingProvider();
    const service = new AIService({}, provider);

    const result = await service.generateText({
      taskType: 'CRITIQUE',
      prompt: 'Review application for student John Doe with email john.doe@mit.edu.',
      anonymize: true,
      customPIIReplacements: { 'John Doe': '[STUDENT_NAME]' },
    });

    // Verify the LLM provider NEVER saw the real name or email
    expect(capturedPrompt).not.toContain('john.doe@mit.edu');
    expect(capturedPrompt).not.toContain('John Doe');
    expect(capturedPrompt).toContain('[STUDENT_NAME]');
    expect(capturedPrompt).toContain('[EMAIL_1]');

    // Verify output de-anonymization restored the real data for application consumption
    expect(result.data).toContain('John Doe');
    expect(result.data).toContain('john.doe@mit.edu');
  });
});
