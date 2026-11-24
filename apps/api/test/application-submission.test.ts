import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';

describe('Explicit User Authorization & Submission Execution (TASK-028)', () => {
  let app: FastifyInstance;

  // In-memory mock tables
  const scholarshipsTable = new Map<string, any>();
  const applicationsTable = new Map<string, any>();
  const missingInfoTable = new Map<string, any>();
  const automationJobsTable = new Map<string, any>();

  const studentUserId = randomUUID();
  const otherUserId = randomUUID();
  let studentToken = '';
  let otherToken = '';

  const mockPrisma = {
    $disconnect: async () => {},
    scholarship: {
      findUnique: async ({ where }: any) => scholarshipsTable.get(where.id) || null,
    },
    application: {
      findUnique: async ({ where, include }: any) => {
        const appRecord = applicationsTable.get(where.id);
        if (!appRecord) return null;
        const res: any = { ...appRecord };
        if (include?.scholarship) {
          res.scholarship = scholarshipsTable.get(appRecord.scholarshipId) || null;
        }
        return res;
      },
      update: async ({ where, data, include }: any) => {
        const existing = applicationsTable.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        applicationsTable.set(where.id, updated);
        const res: any = { ...updated };
        if (include?.scholarship) {
          res.scholarship = scholarshipsTable.get(updated.scholarshipId) || null;
        }
        return res;
      },
    },
    missingInformation: {
      count: async ({ where }: any) => {
        return Array.from(missingInfoTable.values()).filter(
          (m) =>
            m.applicationId === where.applicationId &&
            (where.isResolved === undefined || m.isResolved === where.isResolved)
        ).length;
      },
    },
    automationJob: {
      create: async ({ data }: any) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        automationJobsTable.set(id, record);
        return record;
      },
      findFirst: async ({ where }: any) => {
        return (
          Array.from(automationJobsTable.values())
            .filter((j) => {
              if (where.applicationId && j.applicationId !== where.applicationId) return false;
              if (where.type && j.type !== where.type) return false;
              return true;
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null
        );
      },
      update: async ({ where, data }: any) => {
        const existing = automationJobsTable.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        automationJobsTable.set(where.id, updated);
        return updated;
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

  // =========================================================================
  // Authorization Gate (POST /api/v1/applications/:id/approve)
  // =========================================================================

  it('1. Blocks approval with 400 UNRESOLVED_REQUIREMENTS when unresolved items exist', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'STEM Excellence Award',
      providerName: 'STEM Foundation',
      verificationStatus: 'VERIFIED',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'READY_FOR_REVIEW',
      userApprovedAt: null,
      notes: null,
    });

    // Add an unresolved missing info item
    const missingId = randomUUID();
    missingInfoTable.set(missingId, {
      id: missingId,
      applicationId,
      prompt: 'Upload Official Transcript',
      category: 'DOCUMENT',
      isResolved: false,
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/approve`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        consentSignature: 'Jane Doe',
        consentHash: 'SCHOLARIS_CONSENT_HASH_123',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNRESOLVED_REQUIREMENTS');
    expect(body.error.message).toContain('mandatory requirements remain unresolved');
  });

  it('2. Successfully approves application and records digital consent when all items resolved', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Global Leaders Grant',
      providerName: 'World Leaders Forum',
      verificationStatus: 'VERIFIED',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'READY_FOR_REVIEW',
      userApprovedAt: null,
      notes: null,
    });

    // Ensure all missing items are resolved
    missingInfoTable.clear();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/approve`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        consentSignature: 'Alexander Wright',
        consentHash: 'SCHOLARIS_CONSENT_ALEX_99',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('AWAITING_APPROVAL');
    expect(body.data.userApprovedAt).not.toBeNull();
    expect(body.data.notes).toContain('Alexander Wright');

    // Verify DB update
    const updated = applicationsTable.get(applicationId);
    expect(updated.status).toBe('AWAITING_APPROVAL');
    expect(updated.userApprovedAt).toBeInstanceOf(Date);
  });

  it('3. Rejects approval with 400 when signature is shorter than 3 characters', async () => {
    const applicationId = randomUUID();
    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId: randomUUID(),
      status: 'READY_FOR_REVIEW',
      userApprovedAt: null,
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/approve`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        consentSignature: 'AB', // < 3 chars
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it('4. Rejects approval with 404/403 for unauthorized user (tenant isolation)', async () => {
    const applicationId = randomUUID();
    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId: randomUUID(),
      status: 'READY_FOR_REVIEW',
      userApprovedAt: null,
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/approve`,
      headers: {
        authorization: `Bearer ${otherToken}`,
        'content-type': 'application/json',
      },
      payload: {
        consentSignature: 'Intruder User',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  // =========================================================================
  // Mandatory Submission Rule Invariant (POST /api/v1/applications/:id/submit)
  // =========================================================================

  it('5. Mandatory Submission Rule: Strictly blocks submission with 403 Forbidden if unapproved', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Future Tech Fellowship',
      providerName: 'Tech Alliance',
      verificationStatus: 'VERIFIED',
      websiteUrl: 'https://example.com/portal',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'DRAFT',
      userApprovedAt: null, // UNAPPROVED!
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/submit`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        confirmed: true,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('Explicit student authorization required before submitting');
  });

  it('6. Rejects submission with 400 SCHOLARSHIP_SUSPICIOUS if scholarship is flagged suspicious', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Suspicious Giveaway Scholarship',
      providerName: 'Phishing Entity',
      verificationStatus: 'SUSPICIOUS',
      websiteUrl: 'https://phishing.example.com',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'AWAITING_APPROVAL',
      userApprovedAt: new Date(), // Has approval, but scholarship is suspicious
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/submit`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        confirmed: true,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SCHOLARSHIP_SUSPICIOUS');
  });

  it('7. Successfully enqueues SUBMIT_APPLICATION job and transitions status to SUBMITTING when approved', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Merit Scholars Program',
      providerName: 'Merit Institute',
      verificationStatus: 'VERIFIED',
      websiteUrl: 'https://merit.example.org/apply',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'AWAITING_APPROVAL',
      userApprovedAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/submit`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        confirmed: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('SUBMITTING');
    expect(body.data.jobId).toBeDefined();

    // Verify DB update
    const updated = applicationsTable.get(applicationId);
    expect(updated.status).toBe('SUBMITTING');

    // Verify automation job was created
    const createdJob = automationJobsTable.get(body.data.jobId);
    expect(createdJob).toBeDefined();
    expect(createdJob.type).toBe('SUBMIT_APPLICATION');
    expect(createdJob.applicationId).toBe(applicationId);
  });

  // =========================================================================
  // Live Submission Status & Proof (GET /api/v1/applications/:id/submission-status)
  // =========================================================================

  it('8. Returns live submission status with proof screenshot URL and confirmation code', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();
    const submittedTime = new Date();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'National Honors Fellowship',
      providerName: 'Honors Council',
      verificationStatus: 'VERIFIED',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'SUBMITTED',
      userApprovedAt: new Date(Date.now() - 30000),
      submittedAt: submittedTime,
      submissionProofUrl: 'https://s3.scholaris.app/proofs/submitted-app-123.png',
      notes: 'Submission confirmation reference: HONORS-98721-CONFIRMED',
    });

    // Add associated automation job
    const jobId = randomUUID();
    automationJobsTable.set(jobId, {
      id: jobId,
      applicationId,
      type: 'SUBMIT_APPLICATION',
      status: 'COMPLETED',
      createdAt: submittedTime,
      errorLog: null,
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/submission-status`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('SUBMITTED');
    expect(body.data.submissionProofUrl).toBe('https://s3.scholaris.app/proofs/submitted-app-123.png');
    expect(body.data.submittedAt).toBe(submittedTime.toISOString());
    expect(body.data.confirmationCode).toContain('HONORS-98721');
    expect(body.data.jobId).toBe(jobId);
    expect(body.data.jobStatus).toBe('COMPLETED');
  });

  it('9. Enforces tenant isolation on submission status endpoint', async () => {
    const applicationId = randomUUID();
    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId: randomUUID(),
      status: 'SUBMITTED',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/submission-status`,
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
    });

    expect(res.statusCode).toBe(403);
  });
});
