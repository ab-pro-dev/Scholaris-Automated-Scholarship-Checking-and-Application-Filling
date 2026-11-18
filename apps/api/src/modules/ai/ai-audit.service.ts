import { PrismaClient, AIProviderType, AITaskType, AIRequestStatus } from '@scholaris/database';
import { AIService, AIExecutionOptions, AIExecutionResult } from '@scholaris/ai';
import { calculateAICost } from './pricing.js';
import { AIRateLimiter, AIRateLimitError } from './ai-rate-limiter.js';
import { env } from '../../config/env.js';

export interface LogAIRequestParams {
  userId?: string | null;
  provider: AIProviderType;
  model: string;
  taskType: AITaskType;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: AIRequestStatus;
  costEstimate?: number;
}

export interface GetAuditLogsQuery {
  userId?: string;
  provider?: AIProviderType;
  taskType?: AITaskType;
  status?: AIRequestStatus;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface UserAIUsageSummary {
  userId: string;
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalEstimatedCostUSD: number;
  byTaskType: Record<string, { requests: number; tokens: number; costUSD: number }>;
  byProvider: Record<string, { requests: number; tokens: number }>;
  quota: {
    maxRequestsPerMinute: number;
    maxTokensPerDay: number;
    tokensUsedToday: number;
    requestsInLastMinute: number;
  };
}

export class AIAuditService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiService: AIService,
    private readonly rateLimiter: AIRateLimiter = new AIRateLimiter({
      maxRequestsPerMinute: env.AI_RATE_LIMIT_PER_MINUTE,
      maxTokensPerDay: env.AI_DAILY_TOKEN_LIMIT,
    })
  ) {}

  getRateLimiter(): AIRateLimiter {
    return this.rateLimiter;
  }

  getAIService(): AIService {
    return this.aiService;
  }

  /**
   * Logs a single AI execution record into PostgreSQL.
   */
  async logRequest(params: LogAIRequestParams) {
    const cost =
      params.costEstimate !== undefined
        ? params.costEstimate
        : calculateAICost(params.model, params.promptTokens, params.completionTokens);

    return this.prisma.aIRequest.create({
      data: {
        userId: params.userId || null,
        provider: params.provider,
        model: params.model,
        taskType: params.taskType,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        costEstimate: cost,
        latencyMs: params.latencyMs,
        status: params.status,
      },
    });
  }

  /**
   * Executes a structured AI task with rate-limiting check, latency measurement,
   * token tracking, cost calculation, and persistent database audit logging.
   */
  async executeStructuredWithAudit<T>(
    options: AIExecutionOptions<T>
  ): Promise<AIExecutionResult<T>> {
    // 1. Rate limiter check
    await this.rateLimiter.checkRateLimit(options.userId);

    const startTime = Date.now();
    try {
      const result = await this.aiService.generateStructuredOutput(options);
      const latencyMs = Date.now() - startTime;
      const costEstimate = calculateAICost(result.model, result.promptTokens, result.completionTokens);

      // Record rate limiter usage
      await this.rateLimiter.recordUsage(options.userId, result.totalTokens);

      // Audit log into database
      await this.logRequest({
        userId: options.userId,
        provider: result.provider,
        model: result.model,
        taskType: options.taskType,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs,
        status: result.isFallback ? 'FALLBACK' : 'SUCCESS',
        costEstimate,
      });

      return {
        ...result,
        costEstimate,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;

      // Log failure in database if not an immediate rate limit exception
      if (!(error instanceof AIRateLimitError)) {
        try {
          await this.logRequest({
            userId: options.userId,
            provider: options.preferredProvider || 'GEMINI',
            model: 'unknown',
            taskType: options.taskType,
            promptTokens: 0,
            completionTokens: 0,
            latencyMs,
            status: 'FAILED',
            costEstimate: 0,
          });
        } catch (dbErr) {
          console.error('Failed to log AI execution failure in database:', dbErr);
        }
      }

      throw error;
    }
  }

  /**
   * Executes a free-form AI text task with rate-limiting, latency, token, and database auditing.
   */
  async executeTextWithAudit(
    options: AIExecutionOptions
  ): Promise<AIExecutionResult<string>> {
    // 1. Rate limiter check
    await this.rateLimiter.checkRateLimit(options.userId);

    const startTime = Date.now();
    try {
      const result = await this.aiService.generateText(options);
      const latencyMs = Date.now() - startTime;
      const costEstimate = calculateAICost(result.model, result.promptTokens, result.completionTokens);

      // Record rate limiter usage
      await this.rateLimiter.recordUsage(options.userId, result.totalTokens);

      // Audit log into database
      await this.logRequest({
        userId: options.userId,
        provider: result.provider,
        model: result.model,
        taskType: options.taskType,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs,
        status: result.isFallback ? 'FALLBACK' : 'SUCCESS',
        costEstimate,
      });

      return {
        ...result,
        costEstimate,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;

      if (!(error instanceof AIRateLimitError)) {
        try {
          await this.logRequest({
            userId: options.userId,
            provider: options.preferredProvider || 'GEMINI',
            model: 'unknown',
            taskType: options.taskType,
            promptTokens: 0,
            completionTokens: 0,
            latencyMs,
            status: 'FAILED',
            costEstimate: 0,
          });
        } catch (dbErr) {
          console.error('Failed to log AI execution failure in database:', dbErr);
        }
      }

      throw error;
    }
  }

  /**
   * Retrieves aggregated usage and cost statistics for a student user.
   */
  async getUserUsageStats(userId: string): Promise<UserAIUsageSummary> {
    const requests = await this.prisma.aIRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalEstimatedCostUSD = 0;

    const byTaskType: Record<string, { requests: number; tokens: number; costUSD: number }> = {};
    const byProvider: Record<string, { requests: number; tokens: number }> = {};

    for (const req of requests) {
      const tokens = req.promptTokens + req.completionTokens;
      totalTokens += tokens;
      promptTokens += req.promptTokens;
      completionTokens += req.completionTokens;
      totalEstimatedCostUSD += req.costEstimate || 0;

      // Group by task type
      if (!byTaskType[req.taskType]) {
        byTaskType[req.taskType] = { requests: 0, tokens: 0, costUSD: 0 };
      }
      byTaskType[req.taskType].requests += 1;
      byTaskType[req.taskType].tokens += tokens;
      byTaskType[req.taskType].costUSD += req.costEstimate || 0;

      // Group by provider
      if (!byProvider[req.provider]) {
        byProvider[req.provider] = { requests: 0, tokens: 0 };
      }
      byProvider[req.provider].requests += 1;
      byProvider[req.provider].tokens += tokens;
    }

    const quotaStatus = await this.rateLimiter.getQuotaStatus(userId);

    return {
      userId,
      totalRequests: requests.length,
      totalTokens,
      promptTokens,
      completionTokens,
      totalEstimatedCostUSD: Math.round(totalEstimatedCostUSD * 1_000_000) / 1_000_000,
      byTaskType,
      byProvider,
      quota: {
        maxRequestsPerMinute: quotaStatus.maxRequestsPerMinute,
        maxTokensPerDay: quotaStatus.maxTokensPerDay,
        tokensUsedToday: quotaStatus.tokensUsedToday,
        requestsInLastMinute: quotaStatus.requestsInLastMinute,
      },
    };
  }

  /**
   * Queries paginated AI request audit records with optional filters.
   */
  async getAuditLogs(query: GetAuditLogsQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.provider) where.provider = query.provider;
    if (query.taskType) where.taskType = query.taskType;
    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.aIRequest.count({ where }),
      this.prisma.aIRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
