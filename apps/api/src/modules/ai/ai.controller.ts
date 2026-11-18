import { FastifyReply, FastifyRequest } from 'fastify';
import { AIAuditService } from './ai-audit.service.js';
import { prisma } from '@scholaris/database';
import { AIService } from '@scholaris/ai';
import { env } from '../../config/env.js';
import { AIProviderType, AITaskType, AIRequestStatus } from '@scholaris/database';

export class AIController {
  private customAuditService?: AIAuditService;

  constructor(auditService?: AIAuditService) {
    this.customAuditService = auditService;
  }

  private getAuditService(request: FastifyRequest): AIAuditService {
    if (this.customAuditService) {
      return this.customAuditService;
    }
    const prisma = request.server.prisma;
    const aiService =
      (request.server as any).aiService ||
      new AIService({
        geminiApiKey: env.GEMINI_API_KEY,
        geminiModel: env.GEMINI_MODEL,
        openRouterApiKey: env.OPENROUTER_API_KEY,
        openRouterModel: env.OPENROUTER_MODEL,
      });
    return new AIAuditService(prisma, aiService);
  }

  /**
   * GET /api/v1/ai/usage
   * Returns authenticated user's AI token usage, costs, and rate limit quotas.
   */
  getUserUsage = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const auditService = this.getAuditService(request);
    const usage = await auditService.getUserUsageStats(userId);

    return reply.send({
      success: true,
      data: usage,
    });
  };

  /**
   * GET /api/v1/ai/audit
   * Returns paginated audit logs for the authenticated user (or all if admin).
   */
  getAuditLogs = async (
    request: FastifyRequest<{
      Querystring: {
        userId?: string;
        provider?: AIProviderType;
        taskType?: AITaskType;
        status?: AIRequestStatus;
        page?: string;
        limit?: string;
        startDate?: string;
        endDate?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const currentUserId = request.user.sub;
    const currentUserRole = request.user.role;

    // Strict multi-tenant isolation:
    // Non-admin users can ONLY see their own logs
    let targetUserId = currentUserId;
    if (currentUserRole === 'ADMIN' && request.query.userId) {
      targetUserId = request.query.userId;
    }

    const auditService = this.getAuditService(request);
    const logs = await auditService.getAuditLogs({
      userId: targetUserId,
      provider: request.query.provider,
      taskType: request.query.taskType,
      status: request.query.status,
      page: request.query.page ? parseInt(request.query.page, 10) : 1,
      limit: request.query.limit ? parseInt(request.query.limit, 10) : 20,
      startDate: request.query.startDate,
      endDate: request.query.endDate,
    });

    return reply.send({
      success: true,
      data: logs.items,
      pagination: logs.pagination,
    });
  };
}
