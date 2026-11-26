import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';

describe('Administrative Monitoring & System Metrics (TASK-030)', () => {
  let app: FastifyInstance;

  const jobsList: any[] = [];
  const aiRequestsList: any[] = [];
  const auditLogsList: any[] = [];
  const sessionsList: any[] = [];

  const adminUserId = randomUUID();
  const studentUserId = randomUUID();
  let adminToken = '';
  let studentToken = '';

  const mockPrisma = {
    $disconnect: async () => {},
    automationJob: {
      findMany: async () => jobsList,
    },
    browserSession: {
      count: async ({ where }: any) => {
        if (where.sessionStatus?.in) {
          return sessionsList.filter((s) => where.sessionStatus.in.includes(s.sessionStatus)).length;
        }
        return sessionsList.filter((s) => s.sessionStatus === where.sessionStatus).length;
      },
    },
    aIRequest: {
      findMany: async () => aiRequestsList,
    },
    user: {
      count: async () => 12,
    },
    application: {
      count: async ({ where }: any = {}) => (where?.status === 'SUBMITTED' ? 4 : 18),
    },
    auditLog: {
      findMany: async ({ where }: any) => {
        return auditLogsList.filter((log) => {
          if (where.userId && log.userId !== where.userId) return false;
          if (where.action?.contains && !log.action.toLowerCase().includes(where.action.contains.toLowerCase())) {
            return false;
          }
          if (
            where.entityType?.contains &&
            !log.entityType.toLowerCase().includes(where.entityType.contains.toLowerCase())
          ) {
            return false;
          }
          return true;
        });
      },
      count: async ({ where }: any) => {
        return auditLogsList.filter((log) => {
          if (where.userId && log.userId !== where.userId) return false;
          if (where.action?.contains && !log.action.toLowerCase().includes(where.action.contains.toLowerCase())) {
            return false;
          }
          if (
            where.entityType?.contains &&
            !log.entityType.toLowerCase().includes(where.entityType.contains.toLowerCase())
          ) {
            return false;
          }
          return true;
        }).length;
      },
    },
  };

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma as any;
    await app.ready();

    adminToken = app.jwt.sign({ sub: adminUserId, email: 'admin@scholaris.test', role: 'ADMIN' });
    studentToken = app.jwt.sign({ sub: studentUserId, email: 'student@scholaris.test', role: 'STUDENT' });

    const now = new Date();
    jobsList.push(
      { id: randomUUID(), applicationId: randomUUID(), type: 'FILL_FORM', status: 'QUEUED', attempts: 0, errorLog: null, updatedAt: now },
      { id: randomUUID(), applicationId: randomUUID(), type: 'SUBMIT_APPLICATION', status: 'COMPLETED', attempts: 1, errorLog: null, updatedAt: now },
      { id: randomUUID(), applicationId: randomUUID(), type: 'EXTRACT_FORM', status: 'FAILED', attempts: 2, errorLog: 'Timeout waiting for selector', updatedAt: now }
    );

    sessionsList.push(
      { id: randomUUID(), sessionStatus: 'RUNNING' },
      { id: randomUUID(), sessionStatus: 'PAUSED_FOR_USER' }
    );

    aiRequestsList.push(
      { provider: 'GEMINI', promptTokens: 1000, completionTokens: 500, costEstimate: 0.002, latencyMs: 420, status: 'SUCCESS' },
      { provider: 'OPENROUTER', promptTokens: 800, completionTokens: 200, costEstimate: 0.004, latencyMs: 780, status: 'FALLBACK' }
    );

    auditLogsList.push(
      {
        id: randomUUID(),
        userId: studentUserId,
        user: { email: 'student@scholaris.test' },
        action: 'APPLICATION_APPROVED',
        entityType: 'Application',
        entityId: randomUUID(),
        ipAddress: '127.0.0.1',
        details: { signature: 'Jane Doe' },
        timestamp: now,
      },
      {
        id: randomUUID(),
        userId: adminUserId,
        user: { email: 'admin@scholaris.test' },
        action: 'SCHOLARSHIP_VERIFIED',
        entityType: 'Scholarship',
        entityId: randomUUID(),
        ipAddress: '127.0.0.1',
        details: null,
        timestamp: now,
      }
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Rejects unauthenticated requests with 401 on /admin/metrics and /admin/audit-logs', async () => {
    const res1 = await app.inject({ method: 'GET', url: '/api/v1/admin/metrics' });
    const res2 = await app.inject({ method: 'GET', url: '/api/v1/admin/audit-logs' });
    expect(res1.statusCode).toBe(401);
    expect(res2.statusCode).toBe(401);
  });

  it('2. Strictly enforces ADMIN role guard (blocks STUDENT with 403 Forbidden)', async () => {
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    const res2 = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit-logs',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(res1.statusCode).toBe(403);
    expect(res2.statusCode).toBe(403);
  });

  it('3. Returns aggregated queue health, browser sessions, and AI provider metrics for ADMIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);

    expect(body.data.queues.totalJobs).toBe(3);
    expect(body.data.queues.queued).toBe(1);
    expect(body.data.queues.completed).toBe(1);
    expect(body.data.queues.failed).toBe(1);
    expect(body.data.queues.activeBrowserSessions).toBe(1);
    expect(body.data.queues.pausedBrowserSessions).toBe(1);
    expect(body.data.queues.recentFailedJobs[0].errorLog).toBe('Timeout waiting for selector');

    expect(body.data.ai.totalRequests).toBe(2);
    expect(body.data.ai.totalTokens).toBe(2500);
    expect(body.data.ai.averageLatencyMs).toBe(600);
    expect(body.data.ai.fallbackRatePercent).toBe(50);
    expect(body.data.ai.byProvider.GEMINI.requests).toBe(1);
    expect(body.data.ai.byProvider.OPENROUTER.requests).toBe(1);
  });

  it('4. Filters audit logs by userId and action for ADMIN', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/audit-logs?userId=${studentUserId}&action=APPROVED`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].action).toBe('APPLICATION_APPROVED');
    expect(body.meta.total).toBe(1);
  });
});
