import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { validateUrlForSSRF, SSRFProtectionError } from '../src/modules/scholarships/ssrf-validator.js';
import { FieldMatcherService } from '../src/modules/applications/field-matcher.service.js';
import { EssayDrafterService } from '../src/modules/applications/essay-drafter.service.js';

describe('Security & Privacy Audit Penetration Suite (TASK-032)', () => {
  let app: FastifyInstance;

  const documentsTable = new Map<string, any>();
  const applicationsTable = new Map<string, any>();
  const scholarshipsTable = new Map<string, any>();
  const educationTable = new Map<string, any>();

  const victimUserId = randomUUID();
  const attackerUserId = randomUUID();
  let victimToken = '';
  let attackerToken = '';

  const mockPrisma = {
    $disconnect: async () => {},
    document: {
      findFirst: async ({ where }: any) =>
        Array.from(documentsTable.values()).find(
          (d) => d.id === where.id && (!where.userId || d.userId === where.userId)
        ) || null,
      findUnique: async ({ where }: any) => documentsTable.get(where.id) || null,
      findMany: async () => [],
      delete: async ({ where }: any) => documentsTable.delete(where.id),
    },
    application: {
      findUnique: async ({ where, include }: any) => {
        const rec = applicationsTable.get(where.id);
        if (!rec) return null;
        const res: any = { ...rec };
        if (include?.scholarship) res.scholarship = scholarshipsTable.get(rec.scholarshipId) || null;
        if (include?.fields) res.fields = [];
        if (include?.fieldMappings) res.fieldMappings = [];
        if (include?.missingInformation) res.missingInformation = [];
        if (include?.applicationDocuments) res.applicationDocuments = [];
        if (include?.browserSessions) res.browserSessions = [];
        return res;
      },
    },
    educationRecord: {
      findFirst: async ({ where }: any) =>
        Array.from(educationTable.values()).find(
          (e) => e.id === where.id && (!where.userId || e.userId === where.userId)
        ) || null,
      findUnique: async ({ where }: any) => educationTable.get(where.id) || null,
      findMany: async () => [],
      delete: async ({ where }: any) => educationTable.delete(where.id),
    },
    scholarship: {
      findUnique: async ({ where }: any) => scholarshipsTable.get(where.id) || null,
    },
  };

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma as any;
    await app.ready();

    victimToken = app.jwt.sign({ sub: victimUserId, email: 'victim@scholaris.test', role: 'STUDENT' });
    attackerToken = app.jwt.sign({ sub: attackerUserId, email: 'attacker@scholaris.test', role: 'STUDENT' });
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // 1. Cross-User Tenant Isolation Penetration Attempts
  // =========================================================================

  it('1. Blocks cross-user document download, deletion, and S3 key spoofing with 403 Forbidden', async () => {
    const victimDocId = randomUUID();
    documentsTable.set(victimDocId, {
      id: victimDocId,
      userId: victimUserId,
      name: 'victim-passport.pdf',
      category: 'PASSPORT',
      fileKey: `documents/${victimUserId}/secret-passport.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      checksum: 'abc',
      ocrStatus: 'COMPLETED',
      extractedText: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Attacker tries to download victim's document
    const downloadRes = await app.inject({
      method: 'GET',
      url: `/api/v1/documents/${victimDocId}/download`,
      headers: { authorization: `Bearer ${attackerToken}` },
    });
    expect([403, 404]).toContain(downloadRes.statusCode);

    // Attacker tries to delete victim's document
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/documents/${victimDocId}`,
      headers: { authorization: `Bearer ${attackerToken}` },
    });
    expect([403, 404]).toContain(deleteRes.statusCode);
    expect(documentsTable.has(victimDocId)).toBe(true);

    // Attacker tries to register a document pointing to victim's S3 prefix
    const spoofRes = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/confirm-upload',
      headers: { authorization: `Bearer ${attackerToken}` },
      payload: {
        fileKey: `documents/${victimUserId}/stolen.pdf`,
        name: 'stolen.pdf',
        category: 'PASSPORT',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      },
    });
    expect(spoofRes.statusCode).toBe(403);
  });

  it('2. Blocks cross-user profile record mutation and cross-user application access with 403 Forbidden', async () => {
    const eduId = randomUUID();
    educationTable.set(eduId, {
      id: eduId,
      userId: victimUserId,
      institution: 'Oxford',
    });

    const delEduRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/profile/education/${eduId}`,
      headers: { authorization: `Bearer ${attackerToken}` },
    });
    expect([403, 404]).toContain(delEduRes.statusCode);
    expect(educationTable.has(eduId)).toBe(true);

    const scholarshipId = randomUUID();
    scholarshipsTable.set(scholarshipId, {
      id: scholarshipId,
      title: 'Protected Scholarship',
      providerName: 'Trust',
      verificationStatus: 'VERIFIED',
    });

    const appId = randomUUID();
    applicationsTable.set(appId, {
      id: appId,
      userId: victimUserId,
      scholarshipId,
      status: 'READY_FOR_REVIEW',
    });

    const reviewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/applications/${appId}/review`,
      headers: { authorization: `Bearer ${attackerToken}` },
    });
    expect(reviewRes.statusCode).toBe(403);

    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/applications/${appId}/approve`,
      headers: { authorization: `Bearer ${attackerToken}` },
      payload: { consentConfirmed: true, consentSignature: 'Attacker' },
    });
    expect(approveRes.statusCode).toBe(403);
  });

  // =========================================================================
  // 2. SSRF Payload Blocking Against Internal & Metadata Subnets
  // =========================================================================

  it('3. Blocks all SSRF payloads targeting localhost, AWS/GCP metadata, private RFC1918 subnets, and file:// schemes', async () => {
    const ssrfPayloads = [
      'http://127.0.0.1:3001/api/v1/admin/metrics',
      'http://localhost:5432/',
      'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
      'http://10.0.0.1/internal',
      'http://172.16.0.12/admin',
      'http://192.168.1.1/router',
      'http://[::1]:8080/',
      'file:///etc/passwd',
      'ftp://internal.corp/secret',
    ];

    for (const payload of ssrfPayloads) {
      await expect(validateUrlForSSRF(payload)).rejects.toThrow(SSRFProtectionError);
    }

    // Verify API endpoint rejects SSRF payload cleanly
    const apiRes = await app.inject({
      method: 'POST',
      url: '/api/v1/scholarships/analyze',
      headers: { authorization: `Bearer ${victimToken}` },
      payload: { url: 'http://169.254.169.254/latest/meta-data/' },
    });
    expect(apiRes.statusCode).toBe(400);
  });

  // =========================================================================
  // 3. AI Prompt PII Masking Audit
  // =========================================================================

  it('4. Ensures sensitive passport numbers and encrypted credentials are never included in AI prompts', async () => {
    const sensitivePassport = 'PII_SECRET_PASSPORT_998877';
    const scholarshipId = randomUUID();
    const applicationId = randomUUID();
    const fieldId = randomUUID();

    const capturedPrompts: string[] = [];

    const mockAuditService = {
      executeWithAudit: vi.fn(async (_opts: any, _schema: any, prompt: string) => {
        capturedPrompts.push(prompt);
        return {
          data: {
            matches: [
              {
                fieldKey: 'custom_question',
                matchedValue: null,
                sourceType: 'PROFILE',
                sourcePath: null,
                confidence: 0,
                isMissing: true,
                missingCategory: 'FIELD_VALUE',
                missingPrompt: 'Please answer custom question',
              },
            ],
          },
          provider: 'GEMINI',
          model: 'gemini-1.5-flash',
          promptTokens: 100,
          completionTokens: 50,
          latencyMs: 50,
          wasFallback: false,
        };
      }),
      executeStructuredWithAudit: vi.fn(async (opts: any) => {
        capturedPrompts.push(opts.prompt);
        if (opts.taskType === 'MATCHING') {
          return {
            data: {
              matches: [
                {
                  fieldKey: 'research_focus',
                  matchedValue: null,
                  sourceType: 'PROFILE',
                  sourcePath: null,
                  confidence: 0,
                  isMissing: true,
                  missingCategory: 'FIELD_VALUE',
                  missingPrompt: 'Please provide your primary research focus area',
                },
              ],
            },
            provider: 'GEMINI',
            model: 'gemini-1.5-flash',
            promptTokens: 100,
            completionTokens: 50,
            latencyMs: 50,
            wasFallback: false,
          };
        }
        return {
          data: {
            essayDraft:
              'I am a dedicated computer science researcher focused on ethical AI and sustainable technology development across global communities.',
            wordCount: 18,
            keyHighlightsUsed: ['MSc Computer Science'],
            suggestedEdits: ['Add specific project metrics'],
          },
          provider: 'GEMINI',
          model: 'gemini-1.5-flash',
          promptTokens: 120,
          completionTokens: 80,
          latencyMs: 60,
          wasFallback: false,
        };
      }),
    } as any;

    const auditPrisma: any = {
      $transaction: async (fn: any) => fn(auditPrisma),
      application: {
        findUnique: async () => ({
          id: applicationId,
          userId: victimUserId,
          scholarshipId,
          scholarship: {
            id: scholarshipId,
            title: 'AI Ethics Fellowship',
            providerName: 'Open Science Institute',
            verificationStatus: 'VERIFIED',
          },
          fields: [
            {
              id: fieldId,
              applicationId,
              fieldKey: 'research_focus',
              label: 'Primary Research Focus Area',
              fieldType: 'TEXT',
              options: [],
              isRequired: true,
              pageNumber: 1,
            },
          ],
        }),
        update: async ({ data }: any) => data,
      },
      userProfile: {
        findUnique: async () => ({
          userId: victimUserId,
          fullName: 'Amina Hassan',
          firstName: 'Amina',
          lastName: 'Hassan',
          nationality: 'Kenyan',
          residenceCountry: 'Kenya',
          passportNumberEncrypted: sensitivePassport,
          financialStatement: 'Low-income background',
        }),
      },
      educationRecord: {
        findMany: async () => [
          {
            level: 'MASTER',
            institution: 'University of Nairobi',
            degree: 'MSc',
            fieldOfStudy: 'Computer Science',
            gpa: 3.9,
            maxGpa: 4.0,
            honors: 'Summa Cum Laude',
            isCurrent: true,
          },
        ],
      },
      languageSkill: { findMany: async () => [] },
      achievement: { findMany: async () => [] },
      experience: { findMany: async () => [] },
      document: { findMany: async () => [] },
      fieldMapping: {
        findFirst: async () => null,
        deleteMany: async () => ({ count: 0 }),
        create: async ({ data }: any) => ({ id: randomUUID(), ...data }),
        update: async ({ data }: any) => data,
        createMany: async () => ({ count: 1 }),
      },
      missingInformation: {
        deleteMany: async () => ({ count: 0 }),
        create: async ({ data }: any) => ({ id: randomUUID(), ...data }),
        createMany: async () => ({ count: 1 }),
      },
    };

    const matcher = new FieldMatcherService(auditPrisma, mockAuditService);
    await matcher.matchApplicationFields(applicationId, victimUserId);

    const drafter = new EssayDrafterService(auditPrisma, mockAuditService);
    await drafter.draftEssay(victimUserId, applicationId, {
      fieldId,
      promptText: 'Describe your research goals',
      wordLimit: 300,
      targetTone: 'ACADEMIC',
    });

    expect(capturedPrompts.length).toBe(2);
    for (const prompt of capturedPrompts) {
      expect(prompt).not.toContain(sensitivePassport);
      expect(prompt).not.toContain('passportNumberEncrypted');
    }
  });
});
