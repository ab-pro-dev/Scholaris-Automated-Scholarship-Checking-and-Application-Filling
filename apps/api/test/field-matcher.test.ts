import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { PrismaClient, VerificationStatus } from '@scholaris/database';
import { FieldMatcherService } from '../src/modules/applications/field-matcher.service.js';
import { AIAuditService } from '../src/modules/ai/ai-audit.service.js';

describe('AI Semantic Field Matching Engine & Application Management (TASK-024)', () => {
  let app: FastifyInstance;

  // In-memory mock database tables
  const scholarshipsTable = new Map<string, any>();
  const applicationsTable = new Map<string, any>();
  const applicationFieldsTable = new Map<string, any>();
  const fieldMappingsTable = new Map<string, any>();
  const missingInfoTable = new Map<string, any>();
  const userProfilesTable = new Map<string, any>();
  const educationRecordsTable = new Map<string, any>();
  const documentsTable = new Map<string, any>();
  const languageSkillsTable = new Map<string, any>();
  const achievementsTable = new Map<string, any>();
  const experiencesTable = new Map<string, any>();

  const studentUserId = randomUUID();
  const otherUserId = randomUUID();
  let studentToken = '';
  let otherToken = '';

  const mockPrisma = {
    scholarship: {
      findUnique: async ({ where }: any) => {
        return scholarshipsTable.get(where.id) || null;
      },
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
          res.fieldMappings = Array.from(fieldMappingsTable.values()).filter(
            (m) => m.applicationId === appRecord.id
          );
        }
        if (include?.missingInformation) {
          res.missingInformation = Array.from(missingInfoTable.values()).filter(
            (mi) => mi.applicationId === appRecord.id
          );
        }
        return res;
      },
      findFirst: async ({ where, include }: any) => {
        const found = Array.from(applicationsTable.values()).find(
          (a) => a.userId === where.userId && a.scholarshipId === where.scholarshipId
        );
        if (!found) return null;
        const res: any = { ...found };
        if (include?.scholarship) {
          res.scholarship = scholarshipsTable.get(found.scholarshipId) || null;
        }
        return res;
      },
      findMany: async ({ where }: any) => {
        return Array.from(applicationsTable.values())
          .filter((a) => a.userId === where.userId)
          .map((a) => ({
            ...a,
            scholarship: scholarshipsTable.get(a.scholarshipId),
            _count: {
              fields: Array.from(applicationFieldsTable.values()).filter((f) => f.applicationId === a.id).length,
              fieldMappings: Array.from(fieldMappingsTable.values()).filter((m) => m.applicationId === a.id).length,
              missingInformation: Array.from(missingInfoTable.values()).filter((mi) => mi.applicationId === a.id).length,
            },
          }));
      },
      create: async ({ data, include }: any) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        applicationsTable.set(id, record);
        const res: any = { ...record };
        if (include?.scholarship) {
          res.scholarship = scholarshipsTable.get(data.scholarshipId) || null;
        }
        return res;
      },
      update: async ({ where, data }: any) => {
        const existing = applicationsTable.get(where.id) || {};
        const updated = { ...existing, ...data, updatedAt: new Date() };
        applicationsTable.set(where.id, updated);
        return updated;
      },
    },
    userProfile: {
      findUnique: async ({ where }: any) => {
        return userProfilesTable.get(where.userId) || null;
      },
    },
    educationRecord: {
      findMany: async ({ where }: any) => {
        return Array.from(educationRecordsTable.values()).filter((e) => e.userId === where.userId);
      },
    },
    document: {
      findMany: async ({ where }: any) => {
        return Array.from(documentsTable.values()).filter((d) => d.userId === where.userId);
      },
    },
    languageSkill: {
      findMany: async ({ where }: any) => {
        return Array.from(languageSkillsTable.values()).filter((l) => l.userId === where.userId);
      },
    },
    achievement: {
      findMany: async ({ where }: any) => {
        return Array.from(achievementsTable.values()).filter((a) => a.userId === where.userId);
      },
    },
    experience: {
      findMany: async ({ where }: any) => {
        return Array.from(experiencesTable.values()).filter((e) => e.userId === where.userId);
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
      findMany: async ({ where }: any) => {
        return Array.from(fieldMappingsTable.values()).filter(
          (m) => m.applicationId === where.applicationId
        );
      },
      create: async ({ data }: any) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        fieldMappingsTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const existing = fieldMappingsTable.get(where.id) || {};
        const updated = { ...existing, ...data, updatedAt: new Date() };
        fieldMappingsTable.set(where.id, updated);
        return updated;
      },
      deleteMany: async ({ where }: any) => {
        let count = 0;
        for (const [id, m] of fieldMappingsTable.entries()) {
          if (m.applicationId === where.applicationId) {
            fieldMappingsTable.delete(id);
            count++;
          }
        }
        return { count };
      },
    },
    missingInformation: {
      findUnique: async ({ where }: any) => {
        return missingInfoTable.get(where.id) || null;
      },
      findMany: async ({ where }: any) => {
        return Array.from(missingInfoTable.values()).filter(
          (mi) => mi.applicationId === where.applicationId
        );
      },
      create: async ({ data }: any) => {
        const id = randomUUID();
        const record = { id, ...data, isResolved: false, createdAt: new Date(), updatedAt: new Date() };
        missingInfoTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const existing = missingInfoTable.get(where.id) || {};
        const updated = { ...existing, ...data, updatedAt: new Date() };
        missingInfoTable.set(where.id, updated);
        return updated;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [id, mi] of missingInfoTable.entries()) {
          if (mi.applicationId === where.applicationId && mi.fieldId === where.fieldId) {
            missingInfoTable.set(id, { ...mi, ...data });
            count++;
          }
        }
        return { count };
      },
      deleteMany: async ({ where }: any) => {
        let count = 0;
        for (const [id, mi] of missingInfoTable.entries()) {
          if (mi.applicationId === where.applicationId) {
            missingInfoTable.delete(id);
            count++;
          }
        }
        return { count };
      },
      count: async ({ where }: any) => {
        return Array.from(missingInfoTable.values()).filter(
          (mi) => mi.applicationId === where.applicationId && (where.isResolved !== undefined ? mi.isResolved === where.isResolved : true)
        ).length;
      },
    },
    $transaction: async (fn: any) => {
      return fn(mockPrisma);
    },
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  // Mock AI Audit Service
  const mockAiAuditService = {
    executeStructuredWithAudit: async ({ prompt }: any) => {
      return {
        data: {
          matches: [
            {
              fieldKey: 'honors_awards',
              matchedValue: 'Dean List High Honors',
              sourceType: 'PROFILE',
              sourcePath: 'education[0].honors',
              confidence: 0.9,
              isMissing: false,
            },
            {
              fieldKey: 'gre_score',
              matchedValue: null,
              sourceType: 'USER_INPUT',
              sourcePath: null,
              confidence: 0.0,
              isMissing: true,
              missingCategory: 'FIELD_VALUE',
              missingPrompt: 'Please provide your GRE test score.',
            },
          ],
        },
        provider: 'GEMINI',
        model: 'gemini-1.5-pro',
        tokensUsed: 120,
        latencyMs: 150,
      };
    },
  } as unknown as AIAuditService;

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma;
    (app as any).aiAuditService = mockAiAuditService;
    await app.ready();

    studentToken = app.jwt.sign({ sub: studentUserId, email: 'student@example.com', role: 'STUDENT' });
    otherToken = app.jwt.sign({ sub: otherUserId, email: 'other@example.com', role: 'STUDENT' });

    // Seed student profile
    userProfilesTable.set(studentUserId, {
      id: randomUUID(),
      userId: studentUserId,
      firstName: 'Amina',
      lastName: 'Mohammed',
      fullName: 'Amina Mohammed',
      dateOfBirth: new Date('2001-05-14'),
      gender: 'FEMALE',
      nationality: 'Ethiopia',
      residenceCountry: 'Kenya',
      city: 'Nairobi',
      phone: '+254712345678',
      altEmail: 'amina.alt@example.com',
    });

    // Seed education
    educationRecordsTable.set('edu-1', {
      id: 'edu-1',
      userId: studentUserId,
      level: 'UNDERGRADUATE',
      institution: 'Addis Ababa University',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      gpa: 3.88,
      maxGpa: 4.0,
      honors: 'Dean List High Honors',
      isCurrent: true,
      startDate: new Date('2020-09-01'),
      endDate: new Date('2024-07-01'),
    });

    // Seed document vault
    documentsTable.set('doc-transcript', {
      id: 'doc-transcript-123',
      userId: studentUserId,
      name: 'Official_Transcript_AAU.pdf',
      category: 'TRANSCRIPT',
      mimeType: 'application/pdf',
      sizeBytes: 1048576,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('accurately matches standard profile fields to application controls with high confidence and source attribution', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'DAAD Helmut-Schmidt Masters Programme',
      providerName: 'DAAD',
      verificationStatus: 'VERIFIED',
    });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: studentUserId,
      scholarshipId,
      status: 'DRAFT',
    });

    // Create application fields
    const f1Id = randomUUID();
    const f2Id = randomUUID();
    const f3Id = randomUUID();
    const f4Id = randomUUID();
    const f5Id = randomUUID();
    const f6Id = randomUUID();

    applicationFieldsTable.set(f1Id, {
      id: f1Id,
      applicationId: appId,
      fieldKey: 'given_name',
      label: 'Given / First Name',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
    });
    applicationFieldsTable.set(f2Id, {
      id: f2Id,
      applicationId: appId,
      fieldKey: 'family_name',
      label: 'Family / Last Name',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
    });
    applicationFieldsTable.set(f3Id, {
      id: f3Id,
      applicationId: appId,
      fieldKey: 'undergrad_gpa',
      label: 'Undergraduate GPA',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
    });
    applicationFieldsTable.set(f4Id, {
      id: f4Id,
      applicationId: appId,
      fieldKey: 'field_of_study',
      label: 'Target Major / Field of Study',
      fieldType: 'SELECT',
      options: ['Computer Science', 'Data Science', 'Civil Engineering'],
      isRequired: true,
      pageNumber: 1,
    });
    applicationFieldsTable.set(f5Id, {
      id: f5Id,
      applicationId: appId,
      fieldKey: 'academic_transcript',
      label: 'Official Academic Transcript (PDF)',
      fieldType: 'FILE',
      isRequired: true,
      pageNumber: 1,
    });
    applicationFieldsTable.set(f6Id, {
      id: f6Id,
      applicationId: appId,
      fieldKey: 'personal_statement_essay',
      label: 'Personal Statement Essay (500 words)',
      fieldType: 'TEXTAREA',
      isRequired: true,
      pageNumber: 2,
    });

    const matcherService = new FieldMatcherService(mockPrisma, mockAiAuditService);
    const summary = await matcherService.matchApplicationFields(appId, studentUserId);

    expect(summary.applicationId).toBe(appId);
    expect(summary.totalFieldsCount).toBe(6);
    expect(summary.matchedFieldsCount).toBe(5); // first_name, last_name, gpa, field_of_study, transcript
    expect(summary.missingFieldsCount).toBe(1); // personal statement essay requires student input

    // Check individual mappings
    const givenNameMap = summary.mappings.find((m) => m.fieldId === f1Id);
    expect(givenNameMap?.mappedValue).toBe('Amina');
    expect(givenNameMap?.sourceType).toBe('PROFILE');
    expect(givenNameMap?.sourcePath).toBe('profile.firstName');
    expect(givenNameMap?.confidence).toBeGreaterThanOrEqual(0.95);

    const gpaMap = summary.mappings.find((m) => m.fieldId === f3Id);
    expect(gpaMap?.mappedValue).toBe('3.88');
    expect(gpaMap?.sourceType).toBe('PROFILE');

    // Document mapped
    const transcriptMap = summary.mappings.find((m) => m.fieldId === f5Id);
    expect(transcriptMap?.mappedValue).toBe('doc-transcript-123');
    expect(transcriptMap?.sourceType).toBe('DOCUMENT');

    // Missing Information correctly identified for essay
    const essayMissing = summary.missingInformation.find((mi) => mi.fieldId === f6Id);
    expect(essayMissing).toBeDefined();
    expect(essayMissing?.category).toBe('ESSAY_RESPONSE');
    expect(essayMissing?.prompt).toContain('Personal Statement');

    // Application status transitioned to WAITING_FOR_INPUT
    expect(summary.status).toBe('WAITING_FOR_INPUT');
  });

  it('anti-hallucination invariant: never fabricates missing student credentials or unconfirmed values', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Chevening International Award',
      verificationStatus: 'VERIFIED',
    });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: studentUserId,
      scholarshipId,
      status: 'DRAFT',
    });

    // Create a required field for which student has no record (e.g. CV upload missing in vault)
    const cvFieldId = randomUUID();
    applicationFieldsTable.set(cvFieldId, {
      id: cvFieldId,
      applicationId: appId,
      fieldKey: 'curriculum_vitae',
      label: 'Curriculum Vitae / Resume (PDF)',
      fieldType: 'FILE',
      isRequired: true,
      pageNumber: 1,
    });

    const matcherService = new FieldMatcherService(mockPrisma, mockAiAuditService);
    const summary = await matcherService.matchApplicationFields(appId, studentUserId);

    // Verified that missing document is NOT fabricated
    const cvMissing = summary.missingInformation.find((mi) => mi.fieldId === cvFieldId);
    expect(cvMissing).toBeDefined();
    expect(cvMissing?.category).toBe('DOCUMENT_UPLOAD');
    expect(cvMissing?.prompt).toContain('Document Vault');

    const cvMapping = summary.mappings.find((m) => m.fieldId === cvFieldId);
    expect(cvMapping?.confidence).toBe(0);
    expect(cvMapping?.mappedValue).toBe('');
  });

  it('strictly blocks application creation and field matching on SUSPICIOUS scholarships (Safety Invariant)', async () => {
    const suspiciousId = randomUUID();
    scholarshipsTable.set(suspiciousId, {
      id: suspiciousId,
      title: 'Guaranteed $50,000 Win Wire Now',
      providerName: 'Scam Fund',
      verificationStatus: 'SUSPICIOUS',
    });

    // Attempting to create an application via API
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/applications',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { scholarshipId: suspiciousId },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('SCHOLARSHIP_SUSPICIOUS');
  });

  it('GET /api/v1/applications/:id enforces tenant isolation (blocks other students)', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, { id: scholarshipId, title: 'Oxford Clarendon', verificationStatus: 'VERIFIED' });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: studentUserId,
      scholarshipId,
      status: 'DRAFT',
    });

    // Other student attempts to access
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${appId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it('PATCH /api/v1/applications/:id/field-mappings allows manual student edit with USER_INPUT attribution', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, { id: scholarshipId, title: 'Gates Cambridge', verificationStatus: 'VERIFIED' });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: studentUserId,
      scholarshipId,
      status: 'PREPARING',
    });

    const fieldId = randomUUID();
    applicationFieldsTable.set(fieldId, {
      id: fieldId,
      applicationId: appId,
      fieldKey: 'intended_specialization',
      label: 'Specialization Track',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
    });

    // Student manual edit
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/applications/${appId}/field-mappings`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        fieldId,
        mappedValue: 'Distributed Systems & AI',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.mappedValue).toBe('Distributed Systems & AI');
    expect(body.data.isEditedByUser).toBe(true);
    expect(body.data.sourceType).toBe('USER_INPUT');
    expect(body.data.confidence).toBe(1.0);
  });

  it('POST /api/v1/applications/:id/missing-info/resolve updates missing item and marks application READY_FOR_REVIEW when all resolved', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, { id: scholarshipId, title: 'Eiffel Excellence', verificationStatus: 'VERIFIED' });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: studentUserId,
      scholarshipId,
      status: 'WAITING_FOR_INPUT',
    });

    const missingId = randomUUID();
    const fieldId = randomUUID();
    applicationFieldsTable.set(fieldId, { id: fieldId, applicationId: appId, fieldKey: 'hobbies', label: 'Extracurricular Interests', fieldType: 'TEXT', isRequired: true, pageNumber: 1 });

    missingInfoTable.set(missingId, {
      id: missingId,
      applicationId: appId,
      fieldId,
      prompt: 'Please provide your extracurricular hobbies',
      category: 'FIELD_VALUE',
      isResolved: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${appId}/missing-info/resolve`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        missingInfoId: missingId,
        userResponse: 'Competitive programming and robotics mentoring',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.isAllResolved).toBe(true);
    expect(body.data.resolvedItem.isResolved).toBe(true);

    // Verify application status updated to READY_FOR_REVIEW
    expect(applicationsTable.get(appId)?.status).toBe('READY_FOR_REVIEW');
  });
});
