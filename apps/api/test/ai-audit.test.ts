import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { buildApp } from '../src/app.js';
import { calculateAICost } from '../src/modules/ai/pricing.js';
import { AIRateLimiter, AIRateLimitError } from '../src/modules/ai/ai-rate-limiter.js';
import { AIAuditService } from '../src/modules/ai/ai-audit.service.js';
import { AIController } from '../src/modules/ai/ai.controller.js';
import { BaseAIProvider, AIService, RawAIResponse, AIExecutionOptions } from '@scholaris/ai';
import { PrismaClient } from '@scholaris/database';

// Mock AI Provider for deterministic testing
class MockAIProvider extends BaseAIProvider {
  constructor(
    readonly name: 'GEMINI' | 'OPENROUTER',
    readonly defaultModel: string,
    private mockResponse: string = '{}',
    private shouldFail: boolean = false
  ) {
    super();
  }

  isAvailable() {
    return true;
  }

  setMockResponse(text: string) {
    this.mockResponse = text;
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async generate(_options: AIExecutionOptions): Promise<RawAIResponse> {
    if (this.shouldFail) {
      throw new Error(`[${this.name}] Provider error`);
    }

    return {
      rawText: this.mockResponse,
      provider: this.name,
      model: this.defaultModel,
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    };
  }
}

describe('AI Token Usage & Cost Auditing (TASK-014)', () => {
  let app: FastifyInstance;

  // In-memory mock database
  const usersTable = new Map<string, any>();
  const profilesTable = new Map<string, any>();
  const aiRequestsTable = new Map<string, any>();

  const mockPrisma = {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.id) return usersTable.get(where.id) || null;
        if (where.email) {
          return Array.from(usersTable.values()).find((u) => u.email === where.email) || null;
        }
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const user = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        usersTable.set(id, user);
        return user;
      },
    },
    userProfile: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const profile = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        profilesTable.set(data.userId, profile);
        return profile;
      },
    },
    aIRequest: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = {
          id,
          ...data,
          createdAt: new Date(),
        };
        aiRequestsTable.set(id, record);
        return record;
      },
      findMany: async ({ where, skip = 0, take = 50, orderBy }: any = {}) => {
        let results = Array.from(aiRequestsTable.values());
        if (where?.userId) {
          results = results.filter((r) => r.userId === where.userId);
        }
        if (where?.provider) {
          results = results.filter((r) => r.provider === where.provider);
        }
        if (where?.taskType) {
          results = results.filter((r) => r.taskType === where.taskType);
        }
        if (where?.status) {
          results = results.filter((r) => r.status === where.status);
        }
        return results.slice(skip, skip + take);
      },
      count: async ({ where }: any = {}) => {
        let results = Array.from(aiRequestsTable.values());
        if (where?.userId) {
          results = results.filter((r) => r.userId === where.userId);
        }
        return results.length;
      },
    },
    $transaction: async (callback: any) => {
      return callback(mockPrisma);
    },
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  let testUserToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    (app as any).prisma = mockPrisma;

    // Create a student user
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'ai.student@oxford.edu',
        password: 'Password123!',
        firstName: 'Alan',
        lastName: 'Turing',
      },
    });

    const userBody = JSON.parse(userRes.body);
    testUserId = userBody.data.user.id;
    testUserToken = userBody.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Model Pricing & Cost Calculation', () => {
    it('calculates Gemini 1.5 Flash costs accurately', () => {
      // Prompt: $0.075 / 1M, Completion: $0.30 / 1M
      // 1,000,000 prompt tokens = $0.075
      // 1,000,000 completion tokens = $0.30
      const cost = calculateAICost('gemini-1.5-flash', 1_000_000, 1_000_000);
      expect(cost).toBe(0.375);

      // 10,000 prompt tokens = $0.00075, 2,000 completion = $0.0006
      const smallCost = calculateAICost('gemini-1.5-flash', 10_000, 2_000);
      expect(smallCost).toBe(0.00135);
    });

    it('calculates OpenRouter Llama 3.3 70B costs accurately', () => {
      // Prompt: $0.12 / 1M, Completion: $0.30 / 1M
      const cost = calculateAICost('meta-llama/llama-3.3-70b-instruct', 1_000_000, 1_000_000);
      expect(cost).toBe(0.42);
    });

    it('falls back to default pricing for unrecognized models', () => {
      const cost = calculateAICost('custom-experimental-model', 1_000_000, 1_000_000);
      // Default: $0.10 prompt + $0.30 completion = $0.40
      expect(cost).toBe(0.4);
    });
  });

  describe('AIRateLimiter & Quota Controls', () => {
    it('permits requests within limits and throws AIRateLimitError when RPM is breached', async () => {
      const limiter = new AIRateLimiter({ maxRequestsPerMinute: 3, maxTokensPerDay: 50_000 });
      const userId = 'user-rpm-test';

      // 3 requests allowed
      await limiter.checkRateLimit(userId);
      await limiter.recordUsage(userId, 100);

      await limiter.checkRateLimit(userId);
      await limiter.recordUsage(userId, 100);

      await limiter.checkRateLimit(userId);
      await limiter.recordUsage(userId, 100);

      // 4th request must fail with AIRateLimitError
      await expect(limiter.checkRateLimit(userId)).rejects.toThrow(AIRateLimitError);
    });

    it('throws AIRateLimitError when daily token limit is reached', async () => {
      const limiter = new AIRateLimiter({ maxRequestsPerMinute: 10, maxTokensPerDay: 5_000 });
      const userId = 'user-daily-tokens-test';

      // Record 5,000 tokens
      await limiter.recordUsage(userId, 5_000);

      // Next check must fail due to DAILY_TOKENS
      await expect(limiter.checkRateLimit(userId)).rejects.toThrow(
        /Daily AI token quota reached/
      );
    });

    it('returns accurate AIQuotaStatus', async () => {
      const limiter = new AIRateLimiter({ maxRequestsPerMinute: 5, maxTokensPerDay: 20_000 });
      const userId = 'user-quota-status-test';

      await limiter.recordUsage(userId, 1500);
      await limiter.recordUsage(userId, 2500);

      const status = await limiter.getQuotaStatus(userId);
      expect(status.requestsInLastMinute).toBe(2);
      expect(status.tokensUsedToday).toBe(4000);
      expect(status.maxRequestsPerMinute).toBe(5);
      expect(status.maxTokensPerDay).toBe(20000);
      expect(status.isAllowed).toBe(true);
    });
  });

  describe('AIAuditService Execution & Persistence', () => {
    it('logs successful structured AI task into database with cost estimate and token counts', async () => {
      const validJson = JSON.stringify({ isVerified: true, score: 95 });
      const primary = new MockAIProvider('GEMINI', 'gemini-1.5-flash', validJson);
      const aiService = new AIService({}, primary);
      const auditService = new AIAuditService(mockPrisma, aiService);

      const testSchema = z.object({
        isVerified: z.boolean(),
        score: z.number(),
      });

      const result = await auditService.executeStructuredWithAudit({
        userId: testUserId,
        taskType: 'VERIFICATION',
        prompt: 'Verify scholarship',
        schema: testSchema,
      });

      expect(result.data.isVerified).toBe(true);
      expect(result.costEstimate).toBeGreaterThan(0);

      // Check record in mock database
      const logs = await mockPrisma.aIRequest.findMany({ where: { userId: testUserId } });
      const latest = logs[logs.length - 1];
      expect(latest.userId).toBe(testUserId);
      expect(latest.provider).toBe('GEMINI');
      expect(latest.model).toBe('gemini-1.5-flash');
      expect(latest.taskType).toBe('VERIFICATION');
      expect(latest.status).toBe('SUCCESS');
      expect(latest.promptTokens).toBe(1000);
      expect(latest.completionTokens).toBe(500);
      expect(latest.costEstimate).toBeGreaterThan(0);
    });

    it('records status FALLBACK when primary provider fails and fallback succeeds', async () => {
      const primary = new MockAIProvider('GEMINI', 'gemini-1.5-flash', '{}', true); // primary fails
      const fallbackJson = JSON.stringify({ isVerified: false, score: 30 });
      const fallback = new MockAIProvider('OPENROUTER', 'llama-3.3-70b', fallbackJson);

      const aiService = new AIService({}, primary, fallback);
      const auditService = new AIAuditService(mockPrisma, aiService);

      const testSchema = z.object({
        isVerified: z.boolean(),
        score: z.number(),
      });

      const result = await auditService.executeStructuredWithAudit({
        userId: testUserId,
        taskType: 'VERIFICATION',
        prompt: 'Verify scholarship with fallback',
        schema: testSchema,
      });

      expect(result.isFallback).toBe(true);
      expect(result.provider).toBe('OPENROUTER');

      const logs = await mockPrisma.aIRequest.findMany({ where: { userId: testUserId } });
      const latest = logs[logs.length - 1];
      expect(latest.status).toBe('FALLBACK');
      expect(latest.provider).toBe('OPENROUTER');
    });

    it('logs FAILED status in database when AI execution encounters an error', async () => {
      const primary = new MockAIProvider('GEMINI', 'gemini-1.5-flash', '{}', true);
      const fallback = new MockAIProvider('OPENROUTER', 'llama-3.3-70b', '{}', true);
      const aiService = new AIService({}, primary, fallback);
      const auditService = new AIAuditService(mockPrisma, aiService);

      const testSchema = z.object({ ok: z.boolean() });

      await expect(
        auditService.executeStructuredWithAudit({
          userId: testUserId,
          taskType: 'VERIFICATION',
          prompt: 'Failing prompt',
          schema: testSchema,
        })
      ).rejects.toThrow();

      const logs = await mockPrisma.aIRequest.findMany({ where: { userId: testUserId } });
      const latest = logs[logs.length - 1];
      expect(latest.status).toBe('FAILED');
    });

    it('getUserUsageStats returns aggregated metrics and grouped breakdowns', async () => {
      const primary = new MockAIProvider('GEMINI', 'gemini-1.5-flash', 'Draft essay output');
      const aiService = new AIService({}, primary);
      const auditService = new AIAuditService(mockPrisma, aiService);

      await auditService.executeTextWithAudit({
        userId: testUserId,
        taskType: 'ESSAY_DRAFT',
        prompt: 'Draft essay',
      });

      const stats = await auditService.getUserUsageStats(testUserId);
      expect(stats.userId).toBe(testUserId);
      expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.totalEstimatedCostUSD).toBeGreaterThan(0);
      expect(stats.byTaskType).toHaveProperty('VERIFICATION');
      expect(stats.byTaskType).toHaveProperty('ESSAY_DRAFT');
      expect(stats.quota).toBeDefined();
    });
  });

  describe('HTTP Endpoints (/api/v1/ai)', () => {
    it('GET /api/v1/ai/usage returns 401 Unauthorized without JWT', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/usage',
      });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/v1/ai/usage returns 200 OK with usage statistics for authenticated user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/usage',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe(testUserId);
      expect(body.data.quota).toBeDefined();
    });

    it('GET /api/v1/ai/audit returns 200 OK with paginated logs and tenant isolation', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/audit?page=1&limit=10',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);

      // Verify all returned logs belong strictly to testUserId
      for (const item of body.data) {
        expect(item.userId).toBe(testUserId);
      }
    });
  });
});
