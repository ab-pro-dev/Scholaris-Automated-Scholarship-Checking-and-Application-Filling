import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { PrismaClient } from '@scholaris/database';

describe('Automation & Session Handoff Endpoints (TASK-023)', () => {
  let app: FastifyInstance;

  // In-memory mock tables
  const browserSessionsTable = new Map<string, any>();
  const automationJobsTable = new Map<string, any>();
  const notificationsTable = new Map<string, any>();
  const applicationsTable = new Map<string, any>();

  const testStudentId = randomUUID();
  const otherStudentId = randomUUID();
  let studentToken = '';
  let otherStudentToken = '';

  const mockPrisma = {
    browserSession: {
      findUnique: async ({ where, include }: any) => {
        const session = browserSessionsTable.get(where.id);
        if (!session) return null;
        const res: any = { ...session };
        if (include?.automationJob && session.jobId) {
          res.automationJob = automationJobsTable.get(session.jobId) || null;
        }
        if (include?.application && session.applicationId) {
          res.application = applicationsTable.get(session.applicationId) || null;
        }
        return res;
      },
      update: async ({ where, data, include }: any) => {
        const existing = browserSessionsTable.get(where.id) || {};
        const updated = { ...existing, ...data, updatedAt: new Date() };
        browserSessionsTable.set(where.id, updated);
        const res: any = { ...updated };
        if (include?.automationJob && updated.jobId) {
          res.automationJob = automationJobsTable.get(updated.jobId) || null;
        }
        return res;
      },
    },
    automationJob: {
      update: async ({ where, data }: any) => {
        const existing = automationJobsTable.get(where.id) || {};
        const updated = { ...existing, ...data, updatedAt: new Date() };
        automationJobsTable.set(where.id, updated);
        return updated;
      },
    },
    notification: {
      findUnique: async ({ where }: any) => {
        return notificationsTable.get(where.id) || null;
      },
      findMany: async ({ where, orderBy }: any) => {
        let results = Array.from(notificationsTable.values()).filter(
          (n) => n.userId === where.userId
        );
        if (where.isRead !== undefined) {
          results = results.filter((n) => n.isRead === where.isRead);
        }
        return results;
      },
      update: async ({ where, data }: any) => {
        const existing = notificationsTable.get(where.id) || {};
        const updated = { ...existing, ...data };
        notificationsTable.set(where.id, updated);
        return updated;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [id, n] of notificationsTable.entries()) {
          if (n.userId === where.userId && n.type === where.type) {
            notificationsTable.set(id, { ...n, ...data });
            count++;
          }
        }
        return { count };
      },
    },
    $transaction: async (fn: any) => {
      return fn(mockPrisma);
    },
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma;
    await app.ready();

    studentToken = app.jwt.sign({
      sub: testStudentId,
      email: 'student@example.com',
      role: 'STUDENT',
    });

    otherStudentToken = app.jwt.sign({
      sub: otherStudentId,
      email: 'other@example.com',
      role: 'STUDENT',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/automation/sessions/:id returns session details and attached automation job', async () => {
    const testSessionId = randomUUID();
    const testJobId = randomUUID();
    const testAppId = randomUUID();

    applicationsTable.set(testAppId, {
      id: testAppId,
      userId: testStudentId,
      scholarshipId: randomUUID(),
    });

    automationJobsTable.set(testJobId, {
      id: testJobId,
      type: 'EXTRACT_FORM',
      status: 'ACTIVE',
    });

    browserSessionsTable.set(testSessionId, {
      id: testSessionId,
      applicationId: testAppId,
      jobId: testJobId,
      workerId: 'worker-1',
      sessionStatus: 'PAUSED_FOR_USER',
      errorMessage: 'CAPTCHA detected',
      lastScreenshotUrl: '/screenshots/job-1.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/automation/sessions/${testSessionId}`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(testSessionId);
    expect(body.data.sessionStatus).toBe('PAUSED_FOR_USER');
    expect(body.data.automationJob.type).toBe('EXTRACT_FORM');
  });

  it('GET /api/v1/automation/sessions/:id returns 403 when session belongs to another student', async () => {
    const testSessionId = randomUUID();
    const testAppId = randomUUID();

    // Application owned by other student
    applicationsTable.set(testAppId, {
      id: testAppId,
      userId: otherStudentId,
    });

    browserSessionsTable.set(testSessionId, {
      id: testSessionId,
      applicationId: testAppId,
      sessionStatus: 'PAUSED_FOR_USER',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/automation/sessions/${testSessionId}`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it('POST /api/v1/automation/sessions/:id/resume resumes a PAUSED_FOR_USER session and resolves notifications', async () => {
    const testSessionId = randomUUID();
    const testJobId = randomUUID();
    const testAppId = randomUUID();

    applicationsTable.set(testAppId, {
      id: testAppId,
      userId: testStudentId,
    });

    automationJobsTable.set(testJobId, {
      id: testJobId,
      type: 'EXTRACT_FORM',
      status: 'ACTIVE',
    });

    browserSessionsTable.set(testSessionId, {
      id: testSessionId,
      applicationId: testAppId,
      jobId: testJobId,
      sessionStatus: 'PAUSED_FOR_USER',
      errorMessage: 'CAPTCHA challenge active',
    });

    // Add an ACTION_REQUIRED notification
    const testNotifId = randomUUID();
    notificationsTable.set(testNotifId, {
      id: testNotifId,
      userId: testStudentId,
      type: 'ACTION_REQUIRED',
      title: 'Action Required',
      message: 'Please complete CAPTCHA',
      linkUrl: `/automation/sessions/${testSessionId}`,
      isRead: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/automation/sessions/${testSessionId}/resume`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { userConfirmed: true },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.resumed).toBe(true);

    // Verify session status updated to RUNNING
    const updated = browserSessionsTable.get(testSessionId);
    expect(updated.sessionStatus).toBe('RUNNING');
    expect(updated.errorMessage).toBeNull();

    // Verify notification was marked read
    const notif = notificationsTable.get(testNotifId);
    expect(notif.isRead).toBe(true);
  });

  it('POST /api/v1/automation/sessions/:id/resume returns 400 when session is not in PAUSED_FOR_USER state', async () => {
    const testSessionId = randomUUID();
    browserSessionsTable.set(testSessionId, {
      id: testSessionId,
      sessionStatus: 'RUNNING', // not paused
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/automation/sessions/${testSessionId}/resume`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { userConfirmed: true },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.message).toContain('Only PAUSED_FOR_USER sessions can be resumed');
  });

  it('POST /api/v1/automation/sessions/:id/abort aborts the session and marks it as ERROR', async () => {
    const testSessionId = randomUUID();
    const testJobId = randomUUID();

    automationJobsTable.set(testJobId, { id: testJobId, status: 'ACTIVE' });
    browserSessionsTable.set(testSessionId, {
      id: testSessionId,
      jobId: testJobId,
      sessionStatus: 'PAUSED_FOR_USER',
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/automation/sessions/${testSessionId}/abort`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.aborted).toBe(true);

    expect(browserSessionsTable.get(testSessionId)?.sessionStatus).toBe('ERROR');
    expect(automationJobsTable.get(testJobId)?.status).toBe('FAILED');
  });

  it('GET /api/v1/automation/notifications lists student notifications', async () => {
    const notifId = randomUUID();
    notificationsTable.set(notifId, {
      id: notifId,
      userId: testStudentId,
      type: 'INFO',
      title: 'Portal Ready',
      message: 'Portal loaded successfully',
      isRead: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/automation/notifications',
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((n: any) => n.id === notifId)).toBe(true);
  });

  it('PATCH /api/v1/automation/notifications/:id/read marks notification as read', async () => {
    const notifId = randomUUID();
    notificationsTable.set(notifId, {
      id: notifId,
      userId: testStudentId,
      type: 'INFO',
      title: 'Notice',
      message: 'Notice content',
      isRead: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/automation/notifications/${notifId}/read`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.isRead).toBe(true);
    expect(notificationsTable.get(notifId)?.isRead).toBe(true);
  });
});
