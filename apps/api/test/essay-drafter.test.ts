import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { PrismaClient } from '@scholaris/database';
import { EssayDrafterService } from '../src/modules/applications/essay-drafter.service.js';
import { AIAuditService } from '../src/modules/ai/ai-audit.service.js';

describe('Missing Information & AI Essay Drafting Assistant (TASK-025)', () => {
  let app: FastifyInstance;

  // In-memory mock database
  const scholarshipsTable = new Map<string, any>();
  const applicationsTable = new Map<string, any>();
  const applicationFieldsTable = new Map<string, any>();
  const fieldMappingsTable = new Map<string, any>();
  const missingInfoTable = new Map<string, any>();
  const userProfilesTable = new Map<string, any>();
  const educationRecordsTable = new Map<string, any>();
  const documentsTable = new Map<string, any>();
  const experiencesTable = new Map<string, any>();
  const achievementsTable = new Map<string, any>();
  const languageSkillsTable = new Map<string, any>();

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
    experience: {
      findMany: async ({ where }: any) => {
        return Array.from(experiencesTable.values()).filter((e) => e.userId === where.userId);
      },
    },
    achievement: {
      findMany: async ({ where }: any) => {
        return Array.from(achievementsTable.values()).filter((a) => a.userId === where.userId);
      },
    },
    languageSkill: {
      findMany: async ({ where }: any) => {
        return Array.from(languageSkillsTable.values()).filter((l) => l.userId === where.userId);
      },
    },
    document: {
      findMany: async ({ where }: any) => {
        return Array.from(documentsTable.values()).filter((d) => d.userId === where.userId);
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
    },
    missingInformation: {
      findUnique: async ({ where }: any) => {
        return missingInfoTable.get(where.id) || null;
      },
      findMany: async ({ where, include }: any) => {
        let items = Array.from(missingInfoTable.values()).filter(
          (mi) => mi.applicationId === where.applicationId
        );
        if (include?.field) {
          items = items.map((mi) => ({
            ...mi,
            field: applicationFieldsTable.get(mi.fieldId) || null,
          }));
        }
        return items;
      },
      update: async ({ where, data }: any) => {
        const existing = missingInfoTable.get(where.id) || {};
        const updated = { ...existing, ...data, updatedAt: new Date() };
        missingInfoTable.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        return Array.from(missingInfoTable.values()).filter(
          (mi) =>
            mi.applicationId === where.applicationId &&
            (where.isResolved !== undefined ? mi.isResolved === where.isResolved : true)
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
          essayDraft:
            'My academic trajectory at Addis Ababa University instilled in me a deep passion for scalable artificial intelligence and systems design. Graduating with a 3.88 GPA and receiving the Dean List High Honors affirmed my dedication to rigorous technical problem-solving. Through my tenure as a Research Assistant, I contributed to distributed machine learning pipelines that addressed critical data infrastructure bottlenecks. Receiving the DAAD scholarship will provide the catalytic postgraduate training necessary for me to develop foundational computing solutions that bridge under-resourced digital infrastructure.',
          wordCount: 104,
          keyHighlightsUsed: ['Addis Ababa University', 'GPA 3.88', 'Dean List High Honors', 'Research Assistant'],
          suggestedEdits: [
            'Add a specific anecdote illustrating your leadership during the research assistantship.',
            'Mention one or two target professors or labs at the host university.',
          ],
        },
        provider: 'GEMINI',
        model: 'gemini-1.5-pro',
        tokensUsed: 220,
        latencyMs: 340,
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

    // Seed profile data
    userProfilesTable.set(studentUserId, {
      id: randomUUID(),
      userId: studentUserId,
      firstName: 'Liya',
      lastName: 'Kebede',
      fullName: 'Liya Kebede',
      nationality: 'Ethiopian',
      residenceCountry: 'Ethiopia',
    });

    educationRecordsTable.set('edu-1', {
      id: 'edu-1',
      userId: studentUserId,
      institution: 'Addis Ababa University',
      degree: 'BSc Software Engineering',
      fieldOfStudy: 'Software Engineering',
      gpa: 3.88,
      honors: 'Dean List High Honors',
      isCurrent: true,
    });

    experiencesTable.set('exp-1', {
      id: 'exp-1',
      userId: studentUserId,
      roleTitle: 'Research Assistant',
      organization: 'AAU AI Lab',
      type: 'RESEARCH',
      description: 'Worked on distributed machine learning pipelines.',
    });

    documentsTable.set('doc-1', {
      id: 'doc-1',
      userId: studentUserId,
      name: 'Liya_Transcript.pdf',
      category: 'TRANSCRIPT',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/applications/:id/missing-info returns unresolved missing items with available document options', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, { id: scholarshipId, title: 'Rhodes Scholarship', verificationStatus: 'VERIFIED' });

    const appId = randomUUID();
    applicationsTable.set(appId, { id: appId, userId: studentUserId, scholarshipId, status: 'WAITING_FOR_INPUT' });

    const fieldId = randomUUID();
    applicationFieldsTable.set(fieldId, {
      id: fieldId,
      applicationId: appId,
      fieldKey: 'academic_transcript',
      label: 'Official Transcript (PDF)',
      fieldType: 'FILE',
      isRequired: true,
      pageNumber: 1,
    });

    const infoId = randomUUID();
    missingInfoTable.set(infoId, {
      id: infoId,
      applicationId: appId,
      fieldId,
      prompt: 'Please upload or select your transcript',
      category: 'DOCUMENT_UPLOAD',
      isResolved: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${appId}/missing-info`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].category).toBe('DOCUMENT_UPLOAD');
    expect(body.data[0].availableDocuments.length).toBe(1);
    expect(body.data[0].availableDocuments[0].name).toBe('Liya_Transcript.pdf');
  });

  it('PUT /api/v1/applications/:id/missing-info/:infoId resolves missing item and creates USER_INPUT field mapping', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, { id: scholarshipId, title: 'Erasmus Mundus', verificationStatus: 'VERIFIED' });

    const appId = randomUUID();
    applicationsTable.set(appId, { id: appId, userId: studentUserId, scholarshipId, status: 'WAITING_FOR_INPUT' });

    const fieldId = randomUUID();
    applicationFieldsTable.set(fieldId, {
      id: fieldId,
      applicationId: appId,
      fieldKey: 'specialization',
      label: 'Intended Specialization Track',
      fieldType: 'TEXT',
      isRequired: true,
      pageNumber: 1,
    });

    const infoId = randomUUID();
    missingInfoTable.set(infoId, {
      id: infoId,
      applicationId: appId,
      fieldId,
      prompt: 'Please enter your specialization',
      category: 'FIELD_VALUE',
      isResolved: false,
    });

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/applications/${appId}/missing-info/${infoId}`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        userResponse: 'Cloud Computing & Cyber-Physical Systems',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.resolvedItem.isResolved).toBe(true);
    expect(body.data.isAllResolved).toBe(true);

    // Verify application status updated to READY_FOR_REVIEW
    expect(applicationsTable.get(appId)?.status).toBe('READY_FOR_REVIEW');

    // Verify FieldMapping record was created with USER_INPUT
    const createdMap = Array.from(fieldMappingsTable.values()).find((m) => m.fieldId === fieldId);
    expect(createdMap).toBeDefined();
    expect(createdMap?.mappedValue).toBe('Cloud Computing & Cyber-Physical Systems');
    expect(createdMap?.sourceType).toBe('USER_INPUT');
    expect(createdMap?.isEditedByUser).toBe(true);
  });

  it('POST /api/v1/applications/:id/draft-essay generates tailored, profile-grounded essay draft marked AI_DRAFT', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'DAAD Helmut-Schmidt Postgraduate Award',
      providerName: 'German Academic Exchange Service (DAAD)',
      verificationStatus: 'VERIFIED',
    });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: studentUserId,
      scholarshipId,
      status: 'PREPARING',
    });

    const essayFieldId = randomUUID();
    applicationFieldsTable.set(essayFieldId, {
      id: essayFieldId,
      applicationId: appId,
      fieldKey: 'motivation_letter',
      label: 'Motivation Statement Essay',
      fieldType: 'TEXTAREA',
      isRequired: true,
      pageNumber: 2,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${appId}/draft-essay`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        prompt: 'Describe your academic background, achievements, and why this scholarship matches your goals.',
        wordLimit: 500,
        fieldId: essayFieldId,
        targetTone: 'ACADEMIC',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.sourceType).toBe('AI_DRAFT');
    expect(body.data.requiresUserReview).toBe(true);
    expect(body.data.essayDraft).toContain('Addis Ababa University');
    expect(body.data.wordCount).toBeGreaterThan(50);
    expect(body.data.keyHighlightsUsed).toContain('Dean List High Honors');
    expect(body.data.suggestedEdits.length).toBeGreaterThanOrEqual(1);

    // Verify FieldMapping record created with AI_DRAFT and isEditedByUser: false
    const mapping = Array.from(fieldMappingsTable.values()).find((m) => m.fieldId === essayFieldId);
    expect(mapping).toBeDefined();
    expect(mapping?.sourceType).toBe('AI_DRAFT');
    expect(mapping?.isEditedByUser).toBe(false); // Student review mandatory!
  });

  it('strictly blocks essay drafting on SUSPICIOUS scholarships (Safety Invariant)', async () => {
    const suspiciousScholarshipId = randomUUID();
    scholarshipsTable.set(suspiciousScholarshipId, {
      id: suspiciousScholarshipId,
      title: 'Fake 100% Guaranteed Grant',
      verificationStatus: 'SUSPICIOUS',
    });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: studentUserId,
      scholarshipId: suspiciousScholarshipId,
      status: 'DRAFT',
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${appId}/draft-essay`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        prompt: 'Why should you receive this grant?',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('SCHOLARSHIP_SUSPICIOUS');
  });

  it('enforces tenant isolation: blocks other students from accessing or drafting essays', async () => {
    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, { id: scholarshipId, title: 'Clarendon Fund', verificationStatus: 'VERIFIED' });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: studentUserId,
      scholarshipId,
      status: 'WAITING_FOR_INPUT',
    });

    // Other student tries to fetch missing info
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${appId}/missing-info`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(response.statusCode).toBe(403);
  });
});
