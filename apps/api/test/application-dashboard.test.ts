import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';

describe('Student Application Tracking Dashboard Endpoint (TASK-029)', () => {
  let app: FastifyInstance;

  const scholarshipsTable = new Map<string, any>();
  const applicationsTable = new Map<string, any>();
  const missingInfoTable = new Map<string, any>();
  const fieldsCountMap = new Map<string, number>();
  const mappingsCountMap = new Map<string, number>();

  const studentUserId = randomUUID();
  const otherUserId = randomUUID();
  let studentToken = '';
  let otherToken = '';

  const mockPrisma = {
    $disconnect: async () => {},
    application: {
      findMany: async ({ where }: any) => {
        return Array.from(applicationsTable.values())
          .filter((a) => a.userId === where.userId)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .map((a) => {
            const scholarship = scholarshipsTable.get(a.scholarshipId) || null;
            const unresolved = Array.from(missingInfoTable.values()).filter(
              (m) => m.applicationId === a.id && m.isResolved === false
            );
            const totalMissing = Array.from(missingInfoTable.values()).filter(
              (m) => m.applicationId === a.id
            ).length;

            return {
              ...a,
              scholarship,
              missingInformation: unresolved.map((m) => ({ id: m.id })),
              _count: {
                fields: fieldsCountMap.get(a.id) ?? 0,
                fieldMappings: mappingsCountMap.get(a.id) ?? 0,
                missingInformation: totalMissing,
              },
            };
          });
      },
    },
  };

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma as any;
    await app.ready();

    studentToken = app.jwt.sign({ sub: studentUserId, email: 'student@scholaris.test', role: 'STUDENT' });
    otherToken = app.jwt.sign({ sub: otherUserId, email: 'other@scholaris.test', role: 'STUDENT' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications',
    });
    expect(res.statusCode).toBe(401);
  });

  it('2. Returns enriched dashboard metrics, deadlines, and completion percentages with tenant isolation', async () => {
    const s1 = randomUUID();
    const s2 = randomUUID();
    const sOther = randomUUID();

    const now = Date.now();
    scholarshipsTable.set(s1, {
      id: s1,
      title: 'Chevening Scholarship',
      providerName: 'FCDO UK',
      deadline: new Date(now + 5 * 86400_000),
      verificationStatus: 'VERIFIED',
      fundingType: 'FULL',
    });
    scholarshipsTable.set(s2, {
      id: s2,
      title: 'DAAD Research Grant',
      providerName: 'DAAD Germany',
      deadline: new Date(now + 20 * 86400_000),
      verificationStatus: 'VERIFIED',
      fundingType: 'PARTIAL',
    });
    scholarshipsTable.set(sOther, {
      id: sOther,
      title: 'Private Other Scholarship',
      providerName: 'Other Org',
      deadline: null,
      verificationStatus: 'VERIFIED',
      fundingType: 'TUITION_ONLY',
    });

    const app1 = randomUUID();
    const app2 = randomUUID();
    const appOther = randomUUID();

    applicationsTable.set(app1, {
      id: app1,
      userId: studentUserId,
      scholarshipId: s1,
      status: 'WAITING_FOR_INPUT',
      createdAt: new Date(now - 3600_000),
      updatedAt: new Date(now - 1000_000),
    });
    fieldsCountMap.set(app1, 10);
    mappingsCountMap.set(app1, 7);
    missingInfoTable.set(randomUUID(), { id: randomUUID(), applicationId: app1, isResolved: false });
    missingInfoTable.set(randomUUID(), { id: randomUUID(), applicationId: app1, isResolved: false });
    missingInfoTable.set(randomUUID(), { id: randomUUID(), applicationId: app1, isResolved: true });

    applicationsTable.set(app2, {
      id: app2,
      userId: studentUserId,
      scholarshipId: s2,
      status: 'SUBMITTED',
      submittedAt: new Date(now - 500_000),
      createdAt: new Date(now - 7200_000),
      updatedAt: new Date(now - 500_000),
    });
    fieldsCountMap.set(app2, 8);
    mappingsCountMap.set(app2, 8);

    applicationsTable.set(appOther, {
      id: appOther,
      userId: otherUserId,
      scholarshipId: sOther,
      status: 'DRAFT',
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);

    // Ordered by updatedAt desc -> app2 first, app1 second
    const submittedItem = body.data.find((d: any) => d.id === app2);
    const inProgressItem = body.data.find((d: any) => d.id === app1);

    expect(submittedItem.completionPercentage).toBe(100);
    expect(submittedItem.unresolvedMissingCount).toBe(0);
    expect(submittedItem.scholarship.title).toBe('DAAD Research Grant');

    expect(inProgressItem.completionPercentage).toBe(70);
    expect(inProgressItem.unresolvedMissingCount).toBe(2);
    expect(inProgressItem.scholarship.fundingType).toBe('FULL');

    // Tenant isolation: otherUser's app must not appear
    expect(body.data.some((d: any) => d.id === appOther)).toBe(false);
  });
});
