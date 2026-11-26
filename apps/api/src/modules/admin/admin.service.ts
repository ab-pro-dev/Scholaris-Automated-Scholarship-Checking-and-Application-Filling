import { PrismaClient } from '@scholaris/database';
import {
  AdminSystemMetricsDTO,
  AdminAuditLogPageDTO,
  AutomationJobType,
} from '@scholaris/types';

export interface AdminAuditQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}

export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  async getSystemMetrics(): Promise<AdminSystemMetricsDTO> {
    const [
      jobs,
      activeSessions,
      pausedSessions,
      aiRequests,
      totalUsers,
      totalApplications,
      submittedApplications,
    ] = await Promise.all([
      this.prisma.automationJob.findMany({
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          applicationId: true,
          type: true,
          status: true,
          attempts: true,
          errorLog: true,
          updatedAt: true,
        },
      }),
      this.prisma.browserSession.count({
        where: { sessionStatus: { in: ['INITIALIZING', 'RUNNING'] } },
      }),
      this.prisma.browserSession.count({
        where: { sessionStatus: 'PAUSED_FOR_USER' },
      }),
      this.prisma.aIRequest.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          provider: true,
          promptTokens: true,
          completionTokens: true,
          costEstimate: true,
          latencyMs: true,
          status: true,
        },
      }),
      this.prisma.user.count(),
      this.prisma.application.count(),
      this.prisma.application.count({ where: { status: 'SUBMITTED' } }),
    ]);

    const queued = jobs.filter((j) => j.status === 'QUEUED').length;
    const active = jobs.filter((j) => j.status === 'ACTIVE').length;
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
    const failedJobs = jobs.filter((j) => j.status === 'FAILED');

    let totalTokens = 0;
    let totalEstimatedCostUSD = 0;
    let totalLatencyMs = 0;
    let fallbackCount = 0;
    let failureCount = 0;

    const providerAcc: Record<
      string,
      { requests: number; tokens: number; costUSD: number; latencySum: number }
    > = {};

    for (const req of aiRequests) {
      const tokens = (req.promptTokens || 0) + (req.completionTokens || 0);
      totalTokens += tokens;
      totalEstimatedCostUSD += req.costEstimate || 0;
      totalLatencyMs += req.latencyMs || 0;

      if (req.status === 'FALLBACK') fallbackCount += 1;
      if (req.status === 'FAILED') failureCount += 1;

      if (!providerAcc[req.provider]) {
        providerAcc[req.provider] = { requests: 0, tokens: 0, costUSD: 0, latencySum: 0 };
      }
      providerAcc[req.provider].requests += 1;
      providerAcc[req.provider].tokens += tokens;
      providerAcc[req.provider].costUSD += req.costEstimate || 0;
      providerAcc[req.provider].latencySum += req.latencyMs || 0;
    }

    const totalAi = aiRequests.length;
    const byProvider: AdminSystemMetricsDTO['ai']['byProvider'] = {};
    for (const [provider, stats] of Object.entries(providerAcc)) {
      byProvider[provider] = {
        requests: stats.requests,
        tokens: stats.tokens,
        costUSD: Number(stats.costUSD.toFixed(6)),
        avgLatencyMs: stats.requests > 0 ? Math.round(stats.latencySum / stats.requests) : 0,
      };
    }

    return {
      generatedAt: new Date().toISOString(),
      queues: {
        totalJobs: jobs.length,
        queued,
        active,
        completed,
        failed: failedJobs.length,
        activeBrowserSessions: activeSessions,
        pausedBrowserSessions: pausedSessions,
        recentFailedJobs: failedJobs.slice(0, 10).map((j) => ({
          id: j.id,
          applicationId: j.applicationId,
          type: j.type as AutomationJobType,
          attempts: j.attempts,
          errorLog: j.errorLog,
          updatedAt: j.updatedAt.toISOString(),
        })),
      },
      ai: {
        totalRequests: totalAi,
        totalTokens,
        totalEstimatedCostUSD: Number(totalEstimatedCostUSD.toFixed(6)),
        averageLatencyMs: totalAi > 0 ? Math.round(totalLatencyMs / totalAi) : 0,
        fallbackRatePercent: totalAi > 0 ? Number(((fallbackCount / totalAi) * 100).toFixed(1)) : 0,
        failureRatePercent: totalAi > 0 ? Number(((failureCount / totalAi) * 100).toFixed(1)) : 0,
        byProvider,
      },
      users: {
        totalUsers,
        totalApplications,
        submittedApplications,
      },
    };
  }

  async getAuditLogs(query: AdminAuditQuery): Promise<AdminAuditLogPageDTO> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.entityType) {
      where.entityType = { contains: query.entityType, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { email: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.user?.email || null,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: log.ipAddress,
        details: (log.details as Record<string, unknown> | null) || null,
        timestamp: log.timestamp.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
