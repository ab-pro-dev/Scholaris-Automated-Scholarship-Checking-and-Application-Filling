import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';

describe('API Full Application Lifecycle E2E Integration (TASK-031)', () => {
  let app: FastifyInstance;

  const scholarshipsTable = new Map<string, any>();
  const applicationsTable = new Map<string, any>();
  const applicationFieldsTable = new Map<string, any>();
  const fieldMappingsTable = new Map<string, any>();
  const missingInfoTable = new Map<string, any>();
  const applicationDocumentsTable = new Map<string, any>();
  const browserSessionsTable = new Map<string, any>();
  const automationJobsTable = new Map<string, any>();

  const studentUserId = randomUUID();
  let studentToken = '';

  const mockPrisma = {
    $disconnect: async () => {},
    scholarship: {
      findUnique: async ({ where }: any) => scholarshipsTable.get(where.id) || null,
    },
    applicationField: {
      findFirst: async ({ where }: any) =>
        Array.from(applicationFieldsTable.values()).find(
          (f) => f.id === where.id && f.applicationId === where.applicationId
        ) || null,
    },
    application: {
      findFirst: async ({ where }: any) => {
        return (
          Array.from(applicationsTable.values()).find(
            (a) => a.userId === where.userId && a.scholarshipId === where.scholarshipId
          ) || null
        );
      },
      findUnique: async ({ where, include }: any) => {
        const record = applicationsTable.get(where.id);
        if (!record) return null;
        const res: any = { ...record };
        if (include?.scholarship) {
          res.scholarship = scholarshipsTable.get(record.scholarshipId) || null;
        }
        if (include?.fields) {
          res.fields = Array.from(applicationFieldsTable.values()).filter(
            (f) => f.applicationId === record.id
          );
        }
        if (include?.fieldMappings) {
          res.fieldMappings = Array.from(fieldMappingsTable.values())
            .filter((m) => m.applicationId === record.id)
            .map((m) => ({ ...m, field: applicationFieldsTable.get(m.fieldId) || null }));
        }
        if (include?.missingInformation) {
          res.missingInformation = Array.from(missingInfoTable.values())
            .filter((mi) => mi.applicationId === record.id)
            .map((mi) => ({ ...mi, field: mi.fieldId ? applicationFieldsTable.get(mi.fieldId) : null }));
        }
        if (include?.applicationDocuments) {
          res.applicationDocuments = Array.from(applicationDocumentsTable.values()).filter(
            (ad) => ad.applicationId === record.id
          );
        }
        if (include?.browserSessions) {
          res.browserSessions = Array.from(browserSessionsTable.values()).filter(
            (bs) => bs.applicationId === record.id
          );
        }
        return res;
      },
      findMany: async ({ where }: any) => {
        return Array.from(applicationsTable.values())
          .filter((a) => a.userId === where.userId)
          .map((a) => ({
            ...a,
            scholarship: scholarshipsTable.get(a.scholarshipId) || null,
            missingInformation: Array.from(missingInfoTable.values()).filter(
              (m) => m.applicationId === a.id && !m.isResolved
            ),
            _count: {
              fields: Array.from(applicationFieldsTable.values()).filter((f) => f.applicationId === a.id).length,
              fieldMappings: Array.from(fieldMappingsTable.values()).filter((m) => m.applicationId === a.id).length,
              missingInformation: Array.from(missingInfoTable.values()).filter((m) => m.applicationId === a.id).length,
            },
          }));
      },
      create: async ({ data, include }: any) => {
        const id = randomUUID();
        const record = {
          id,
          ...data,
          userApprovedAt: null,
          submittedAt: null,
          submissionProofUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        applicationsTable.set(id, record);
        const res: any = { ...record };
        if (include?.scholarship) {
          res.scholarship = scholarshipsTable.get(record.scholarshipId) || null;
        }
        return res;
      },
      update: async ({ where, data, include }: any) => {
        const existing = applicationsTable.get(where.id);
        if (!existing) throw new Error('Application not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        applicationsTable.set(where.id, updated);
        const res: any = { ...updated };
        if (include?.scholarship) {
          res.scholarship = scholarshipsTable.get(updated.scholarshipId) || null;
        }
        return res;
      },
    },
    fieldMapping: {
      findFirst: async ({ where }: any) =>
        Array.from(fieldMappingsTable.values()).find(
          (m) => m.applicationId === where.applicationId && m.fieldId === where.fieldId
        ) || null,
      create: async ({ data }: any) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        fieldMappingsTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const existing = fieldMappingsTable.get(where.id);
        const updated = { ...existing, ...data, updatedAt: new Date() };
        fieldMappingsTable.set(where.id, updated);
        return updated;
      },
    },
    missingInformation: {
      findUnique: async ({ where }: any) => missingInfoTable.get(where.id) || null,
      update: async ({ where, data }: any) => {
        const existing = missingInfoTable.get(where.id);
        const updated = { ...existing, ...data, updatedAt: new Date() };
        missingInfoTable.set(where.id, updated);
        return updated;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [id, m] of missingInfoTable.entries()) {
          if (m.applicationId === where.applicationId && (!where.fieldId || m.fieldId === where.fieldId)) {
            missingInfoTable.set(id, { ...m, ...data, updatedAt: new Date() });
            count++;
          }
        }
        return { count };
      },
      count: async ({ where }: any) =>
        Array.from(missingInfoTable.values()).filter(
          (m) =>
            m.applicationId === where.applicationId &&
            (where.isResolved === undefined || m.isResolved === where.isResolved)
        ).length,
    },
    automationJob: {
      create: async ({ data }: any) => {
        const id = randomUUID();
        const record = { id, ...data, errorLog: null, createdAt: new Date(), updatedAt: new Date() };
        automationJobsTable.set(id, record);
        return record;
      },
      findFirst: async ({ where }: any) =>
        Array.from(automationJobsTable.values()).find(
          (j) => j.applicationId === where.applicationId && j.type === where.type
        ) || null,
    },
  };

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma as any;
    await app.ready();

    studentToken = app.jwt.sign({
      sub: studentUserId,
      email: 'e2e-student@scholaris.test',
      role: 'STUDENT',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes full API lifecycle from creation -> missing info resolution -> review -> explicit approval -> submission & dashboard tracking', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'E2E Global Merit Award',
      providerName: 'Global Merit Trust',
      websiteUrl: 'https://merit.example.org',
      applicationUrl: 'https://merit.example.org/apply',
      deadline: new Date(Date.now() + 10 * 86400_000),
      verificationStatus: 'VERIFIED',
      fundingType: 'FULL',
    });

    // 1. Create application
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/applications',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { scholarshipId },
    });
    expect(createRes.statusCode).toBe(201);
    const applicationId = createRes.json().data.id;

    // Seed extracted fields + 1 unresolved essay prompt
    const field1Id = randomUUID();
    const field2Id = randomUUID();
    applicationFieldsTable.set(field1Id, {
      id: field1Id,
      applicationId,
      fieldKey: 'full_name',
      label: 'Full Name',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
      sectionName: 'Personal Information',
    });
    applicationFieldsTable.set(field2Id, {
      id: field2Id,
      applicationId,
      fieldKey: 'motivation',
      label: 'Motivation Essay',
      fieldType: 'TEXTAREA',
      isRequired: true,
      pageNumber: 1,
      sectionName: 'Essays',
    });
    fieldMappingsTable.set(randomUUID(), {
      id: randomUUID(),
      applicationId,
      fieldId: field1Id,
      mappedValue: 'Amina Hassan',
      sourceType: 'PROFILE',
      confidence: 1.0,
      isEditedByUser: false,
    });
    const missingId = randomUUID();
    missingInfoTable.set(missingId, {
      id: missingId,
      applicationId,
      fieldId: field2Id,
      prompt: 'Provide your motivation statement',
      category: 'ESSAY_RESPONSE',
      isResolved: false,
    });

    // 2. Review before resolution -> canAuthorizeSubmission must be false
    const reviewBefore = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/review`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(reviewBefore.statusCode).toBe(200);
    expect(reviewBefore.json().data.summary.canAuthorizeSubmission).toBe(false);

    // 3. Resolve missing info item -> transitions to READY_FOR_REVIEW
    const resolveRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/applications/${applicationId}/missing-info/${missingId}`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { userResponse: 'I am dedicated to advancing clean energy research.' },
    });
    expect(resolveRes.statusCode).toBe(200);
    expect(resolveRes.json().data.isAllResolved).toBe(true);

    // 4. Review after resolution -> canAuthorizeSubmission is now true
    const reviewAfter = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/review`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(reviewAfter.statusCode).toBe(200);
    expect(reviewAfter.json().data.status).toBe('READY_FOR_REVIEW');
    expect(reviewAfter.json().data.summary.canAuthorizeSubmission).toBe(true);
    expect(reviewAfter.json().data.summary.completionPercentage).toBe(100);

    // 5. Attempting submit BEFORE approval must fail with 403 Forbidden
    const unapprovedSubmit = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/submit`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { confirmed: true },
    });
    expect(unapprovedSubmit.statusCode).toBe(403);

    // 6. Explicit student approval
    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/approve`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        consentConfirmed: true,
        consentSignature: 'Amina Hassan',
        consentHash: 'E2E_HASH_001',
      },
    });
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.json().data.status).toBe('AWAITING_APPROVAL');

    // 7. Trigger submission -> transitions to SUBMITTING
    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${applicationId}/submit`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { confirmed: true },
    });
    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.json().data.status).toBe('SUBMITTING');

    // 8. Simulate browser worker confirmation + verify status & dashboard
    await mockPrisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submissionProofUrl: 'https://s3.scholaris.app/proofs/e2e-proof.png',
        notes: 'Confirmation reference: SCH-2026-E2E',
      },
    });

    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/submission-status`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json().data.status).toBe('SUBMITTED');
    expect(statusRes.json().data.confirmationCode).toBe('SCH-2026-E2E');

    const dashboardRes = await app.inject({
      method: 'GET',
      url: '/api/v1/applications',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(dashboardRes.statusCode).toBe(200);
    expect(dashboardRes.json().data).toHaveLength(1);
    expect(dashboardRes.json().data[0].status).toBe('SUBMITTED');
    expect(dashboardRes.json().data[0].completionPercentage).toBe(100);
  });
});
