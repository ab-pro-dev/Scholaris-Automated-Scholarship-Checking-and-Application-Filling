import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { PrismaClient } from '@scholaris/database';

describe('Pre-Submission Application Review Interface (TASK-027)', () => {
  let app: FastifyInstance;

  // In-memory mock database tables
  const scholarshipsTable = new Map<string, any>();
  const applicationsTable = new Map<string, any>();
  const applicationFieldsTable = new Map<string, any>();
  const fieldMappingsTable = new Map<string, any>();
  const missingInfoTable = new Map<string, any>();
  const applicationDocumentsTable = new Map<string, any>();
  const documentsTable = new Map<string, any>();
  const browserSessionsTable = new Map<string, any>();

  const studentUserId = randomUUID();
  const otherUserId = randomUUID();
  let studentToken = '';
  let otherToken = '';

  const mockPrisma = {
    $disconnect: async () => {},
    scholarship: {
      findUnique: async ({ where }: any) => scholarshipsTable.get(where.id) || null,
    },
    applicationField: {
      findFirst: async ({ where }: any) => {
        return (
          Array.from(applicationFieldsTable.values()).find(
            (f) => f.id === where.id && f.applicationId === where.applicationId
          ) || null
        );
      },
      findUnique: async ({ where }: any) => applicationFieldsTable.get(where.id) || null,
    },
    application: {
      findUnique: async ({ where, include }: any) => {
        const appRecord = applicationsTable.get(where.id);
        if (!appRecord) return null;
        const res: any = { ...appRecord };
        if (include?.scholarship) {
          res.scholarship = scholarshipsTable.get(appRecord.scholarshipId) || null;
        }
        if (include?.fields) {
          res.fields = Array.from(applicationFieldsTable.values()).filter(
            (f) => f.applicationId === appRecord.id
          );
        }
        if (include?.fieldMappings) {
          res.fieldMappings = Array.from(fieldMappingsTable.values())
            .filter((m) => m.applicationId === appRecord.id)
            .map((m) => ({
              ...m,
              field: applicationFieldsTable.get(m.fieldId) || null,
            }));
        }
        if (include?.missingInformation) {
          res.missingInformation = Array.from(missingInfoTable.values())
            .filter((mi) => mi.applicationId === appRecord.id)
            .map((mi) => ({
              ...mi,
              field: mi.fieldId ? applicationFieldsTable.get(mi.fieldId) : null,
            }));
        }
        if (include?.applicationDocuments) {
          res.applicationDocuments = Array.from(applicationDocumentsTable.values())
            .filter((ad) => ad.applicationId === appRecord.id)
            .map((ad) => ({
              ...ad,
              document: documentsTable.get(ad.documentId) || null,
            }));
        }
        if (include?.browserSessions) {
          res.browserSessions = Array.from(browserSessionsTable.values())
            .filter((bs) => bs.applicationId === appRecord.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return res;
      },
      update: async ({ where, data }: any) => {
        const existing = applicationsTable.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data };
        applicationsTable.set(where.id, updated);
        return updated;
      },
    },
    fieldMapping: {
      findFirst: async ({ where }: any) => {
        return (
          Array.from(fieldMappingsTable.values()).find(
            (m) => m.applicationId === where.applicationId && m.fieldId === where.fieldId
          ) || null
        );
      },
      update: async ({ where, data }: any) => {
        const existing = fieldMappingsTable.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        fieldMappingsTable.set(where.id, updated);
        return updated;
      },
      create: async ({ data }: any) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        fieldMappingsTable.set(id, record);
        return record;
      },
    },
    missingInformation: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [id, item] of missingInfoTable.entries()) {
          if (
            (!where.applicationId || item.applicationId === where.applicationId) &&
            (!where.fieldId || item.fieldId === where.fieldId)
          ) {
            missingInfoTable.set(id, { ...item, ...data, updatedAt: new Date() });
            count++;
          }
        }
        return { count };
      },
      count: async ({ where }: any) => {
        return Array.from(missingInfoTable.values()).filter(
          (m) => m.applicationId === where.applicationId && m.isResolved === where.isResolved
        ).length;
      },
      findUnique: async ({ where }: any) => missingInfoTable.get(where.id) || null,
      update: async ({ where, data }: any) => {
        const existing = missingInfoTable.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        missingInfoTable.set(where.id, updated);
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

  it('1. Returns complete structured review data with sections, document attachments, and summary stats', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Global Leaders STEM Fellowship 2026',
      providerName: 'International Academic Trust',
      websiteUrl: 'https://trust.org/fellowship',
      applicationUrl: 'https://trust.org/apply',
      deadline: new Date('2026-12-31'),
      fundingType: 'FULL',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'WAITING_FOR_INPUT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed application fields
    const f1Id = randomUUID();
    const f2Id = randomUUID();
    const f3Id = randomUUID();

    applicationFieldsTable.set(f1Id, {
      id: f1Id,
      applicationId,
      fieldKey: 'first_name',
      label: 'First Name',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
    });

    applicationFieldsTable.set(f2Id, {
      id: f2Id,
      applicationId,
      fieldKey: 'essay_goals',
      label: 'Statement of Academic Goals',
      fieldType: 'TEXTAREA',
      isRequired: true,
      pageNumber: 2,
    });

    applicationFieldsTable.set(f3Id, {
      id: f3Id,
      applicationId,
      fieldKey: 'passport_scan',
      label: 'Passport Identification Scan',
      fieldType: 'FILE',
      isRequired: true,
      pageNumber: 2,
    });

    // Seed verified mapping for field 1
    const m1Id = randomUUID();
    fieldMappingsTable.set(m1Id, {
      id: m1Id,
      applicationId,
      fieldId: f1Id,
      mappedValue: 'Elena',
      sourceType: 'PROFILE',
      sourcePath: 'profile.firstName',
      confidence: 1.0,
      isEditedByUser: false,
    });

    // Seed missing information for field 2 (unresolved)
    const mi1Id = randomUUID();
    missingInfoTable.set(mi1Id, {
      id: mi1Id,
      applicationId,
      fieldId: f2Id,
      prompt: 'Please provide your statement of academic goals',
      category: 'ESSAY_RESPONSE',
      isResolved: false,
      userResponse: null,
    });

    // Seed document attached for field 3
    const docId = randomUUID();
    documentsTable.set(docId, {
      id: docId,
      name: 'passport_elena.pdf',
      category: 'PASSPORT',
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 512,
      fileKey: 'users/elena/passport.pdf',
    });

    const adId = randomUUID();
    applicationDocumentsTable.set(adId, {
      id: adId,
      applicationId,
      documentId: docId,
      targetFieldKey: 'passport_scan',
      createdAt: new Date(),
    });

    // Seed browser session screenshot
    const bsId = randomUUID();
    browserSessionsTable.set(bsId, {
      id: bsId,
      applicationId,
      lastScreenshotUrl: '/screenshots/filled-form-test.png',
      createdAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/review`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);

    const review = body.data;
    expect(review.applicationId).toBe(applicationId);
    expect(review.scholarship.title).toBe('Global Leaders STEM Fellowship 2026');
    expect(review.previewScreenshotUrl).toBe('/screenshots/filled-form-test.png');

    // Verify Summary stats
    expect(review.summary.totalFieldsCount).toBe(3);
    expect(review.summary.unresolvedCount).toBe(1);
    expect(review.summary.canAuthorizeSubmission).toBe(false); // Unresolved item blocks submission

    // Verify Sections grouping
    expect(review.sections.length).toBe(2);
    expect(review.sections[0].pageNumber).toBe(1);
    expect(review.sections[0].fields[0].mappedValue).toBe('Elena');
    expect(review.sections[0].fields[0].sourceType).toBe('PROFILE');

    // Verify Attached documents
    expect(review.attachedDocuments.length).toBe(1);
    expect(review.attachedDocuments[0].name).toBe('passport_elena.pdf');
    expect(review.attachedDocuments[0].category).toBe('PASSPORT');
  });

  it('2. In-place field mapping edits update review response immediately', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();
    const fieldId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Research Excellence Grant',
      providerName: 'National Science Council',
      fundingType: 'PARTIAL',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'READY_FOR_REVIEW',
    });

    applicationFieldsTable.set(fieldId, {
      id: fieldId,
      applicationId,
      fieldKey: 'research_topic',
      label: 'Proposed Research Topic',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
    });

    const mappingId = randomUUID();
    fieldMappingsTable.set(mappingId, {
      id: mappingId,
      applicationId,
      fieldId,
      mappedValue: 'Initial Machine Learning Outline',
      sourceType: 'AI_DRAFT',
      confidence: 0.85,
      isEditedByUser: false,
    });

    // In-place edit via PATCH
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/applications/${applicationId}/field-mappings`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        fieldId,
        mappedValue: 'Deep Reinforcement Learning for Grid Optimization',
      },
    });

    expect(patchRes.statusCode).toBe(200);

    // Fetch review endpoint and verify update
    const reviewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/review`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(reviewRes.statusCode).toBe(200);
    const review = reviewRes.json().data;

    const updatedField = review.sections[0].fields[0];
    expect(updatedField.mappedValue).toBe('Deep Reinforcement Learning for Grid Optimization');
    expect(updatedField.sourceType).toBe('USER_INPUT');
    expect(updatedField.isEditedByUser).toBe(true);
    expect(updatedField.confidence).toBe(1.0);
  });

  it('3. Enables canAuthorizeSubmission when 100% of mandatory items are resolved and status is READY_FOR_REVIEW', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();
    const fieldId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Full Meridian Scholarship',
      providerName: 'Meridian Foundation',
      fundingType: 'FULL',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: studentUserId,
      scholarshipId,
      status: 'READY_FOR_REVIEW',
    });

    applicationFieldsTable.set(fieldId, {
      id: fieldId,
      applicationId,
      fieldKey: 'gpa',
      label: 'Undergraduate GPA',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
    });

    const mappingId = randomUUID();
    fieldMappingsTable.set(mappingId, {
      id: mappingId,
      applicationId,
      fieldId,
      mappedValue: '3.92',
      sourceType: 'PROFILE',
      confidence: 1.0,
      isEditedByUser: false,
    });

    const reviewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/review`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(reviewRes.statusCode).toBe(200);
    const review = reviewRes.json().data;

    expect(review.summary.unresolvedCount).toBe(0);
    expect(review.summary.canAuthorizeSubmission).toBe(true);
    expect(review.summary.completionPercentage).toBe(100);
  });

  it('4. Enforces strict tenant isolation: Prevents accessing review of another student application', async () => {
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();

    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Confidential Foundation Award',
      providerName: 'Private Trust',
      fundingType: 'FULL',
    });

    applicationsTable.set(applicationId, {
      id: applicationId,
      userId: otherUserId, // Owned by another student
      scholarshipId,
      status: 'READY_FOR_REVIEW',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${applicationId}/review`,
      headers: { authorization: `Bearer ${studentToken}` }, // Request made by studentUserId
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('permission');
  });
});
