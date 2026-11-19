import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import {
  ScholarshipRequirementsService,
  ExtractedRequirementsOutput,
} from '../src/modules/scholarships/scholarship-requirements.service.js';
import { ScholarshipFetcherService, FetchedWebContent } from '../src/modules/scholarships/scholarship-fetcher.service.js';
import { AIAuditService } from '../src/modules/ai/ai-audit.service.js';
import { BaseAIProvider, AIService, RawAIResponse, AIExecutionOptions } from '@scholaris/ai';
import { PrismaClient } from '@scholaris/database';

class MockRequirementsAIProvider extends BaseAIProvider {
  constructor(
    readonly name: 'GEMINI' | 'OPENROUTER',
    readonly defaultModel: string,
    private mockJson: string = '{}'
  ) {
    super();
  }

  isAvailable() {
    return true;
  }

  setMockJson(json: string) {
    this.mockJson = json;
  }

  async generate(_options: AIExecutionOptions): Promise<RawAIResponse> {
    return {
      rawText: this.mockJson,
      provider: this.name,
      model: this.defaultModel,
      promptTokens: 1400,
      completionTokens: 420,
      totalTokens: 1820,
    };
  }
}

describe('Scholarship Requirement Extraction Engine (TASK-018)', () => {
  let app: FastifyInstance;

  // In-memory mock database
  const usersTable = new Map<string, any>();
  const scholarshipsTable = new Map<string, any>();
  const requirementsTable = new Map<string, any>();
  const aiRequestsTable = new Map<string, any>();

  const mockPrisma = {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.id) return usersTable.get(where.id) || null;
        if (where.email) {
          return Array.from(usersTable.values()).find((u) => u.email === where.email) || null;
        }
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const user = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        usersTable.set(id, user);
        return user;
      },
    },
    userProfile: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        return { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      },
    },
    scholarship: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const found = scholarshipsTable.get(where.id);
        if (!found) return null;
        const requirements = Array.from(requirementsTable.values()).filter(
          (r) => r.scholarshipId === found.id
        );
        return { ...found, requirements };
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          requirements: [],
        };
        scholarshipsTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = scholarshipsTable.get(where.id);
        if (!existing) throw new Error('Scholarship not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        scholarshipsTable.set(where.id, updated);
        return updated;
      },
    },
    eligibilityRequirement: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        return requirementsTable.get(where.id) || null;
      },
      findMany: async ({ where, orderBy }: { where: { scholarshipId: string }; orderBy?: any }) => {
        let items = Array.from(requirementsTable.values()).filter(
          (r) => r.scholarshipId === where.scholarshipId
        );
        if (orderBy) {
          items.sort((a, b) => {
            if (a.isMandatory !== b.isMandatory) {
              return a.isMandatory ? -1 : 1;
            }
            return a.category.localeCompare(b.category);
          });
        }
        return items;
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date() };
        requirementsTable.set(id, record);
        return record;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const record = requirementsTable.get(where.id);
        requirementsTable.delete(where.id);
        return record;
      },
      deleteMany: async ({ where }: { where: { scholarshipId: string } }) => {
        let count = 0;
        for (const [id, r] of requirementsTable.entries()) {
          if (r.scholarshipId === where.scholarshipId) {
            requirementsTable.delete(id);
            count++;
          }
        }
        return { count };
      },
    },
    aIRequest: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date() };
        aiRequestsTable.set(id, record);
        return record;
      },
    },
    $transaction: async (callback: any) => callback(mockPrisma),
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  class MockRequirementsFetcher extends ScholarshipFetcherService {
    async fetchSafeContent(targetUrl: string): Promise<FetchedWebContent> {
      return {
        html: `<html><body>Requirements content for ${targetUrl}</body></html>`,
        cleanText: `Candidates must have a minimum GPA of 3.7. Applicants must be under 30 years of age. Open to international candidates. IELTS score of at least 7.5 required. Degree: Master's or PhD in Computer Science or AI.`,
        title: 'Eligibility Requirements',
        finalUrl: targetUrl,
        statusCode: 200,
        contentLengthBytes: 300,
      };
    }
  }

  let testUserToken: string;
  let mockAiProvider: MockRequirementsAIProvider;
  let requirementsService: ScholarshipRequirementsService;

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma;

    mockAiProvider = new MockRequirementsAIProvider('GEMINI', 'gemini-1.5-pro');
    const customAiService = new AIService({}, mockAiProvider);
    const customAiAuditService = new AIAuditService(mockPrisma, customAiService);
    const customFetcher = new MockRequirementsFetcher();

    requirementsService = new ScholarshipRequirementsService(
      mockPrisma,
      customAiAuditService,
      customFetcher
    );

    (app as any).aiAuditService = customAiAuditService;
    (app as any).scholarshipFetcherService = customFetcher;

    // Register test student
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'applicant.ada@cambridge.ac.uk',
        password: 'Password123!',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });

    const userBody = JSON.parse(userRes.body);
    testUserToken = userBody.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('successfully extracts structured, normalized eligibility requirements from scholarship content', async () => {
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Gates Cambridge Scholarship 2026',
        providerName: 'Gates Cambridge Trust',
        websiteUrl: 'https://www.gatescambridge.org/apply/eligibility/',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 98,
        verificationSummary: 'Prestigious postgraduate scholarship at Cambridge University.',
      },
    });

    const mockOutput: ExtractedRequirementsOutput = {
      extractionSummary:
        'Gates Cambridge requires exceptional academic merit (minimum GPA 3.7 or First Class honours), proof of leadership, and enrollment in a full-time postgraduate course. Citizens of any country outside the United Kingdom are eligible.',
      detectedEligibleTarget: 'Postgraduate International Students',
      requirements: [
        {
          category: 'GPA',
          operator: 'GTE',
          requiredValue: '3.7',
          isMandatory: true,
          description: 'Minimum undergraduate GPA of 3.7 on a 4.0 scale or UK First Class Honours.',
        },
        {
          category: 'DEGREE_LEVEL',
          operator: 'EQ',
          requiredValue: 'POSTGRADUATE',
          isMandatory: true,
          description: 'Must be applying for a full-time postgraduate course (PhD or MSc) at Cambridge.',
        },
        {
          category: 'NATIONALITY',
          operator: 'IN',
          requiredValue: 'NON_UK_INTERNATIONAL',
          isMandatory: true,
          description: 'Must be a citizen of any country outside the United Kingdom.',
        },
        {
          category: 'LANGUAGE',
          operator: 'GTE',
          requiredValue: 'IELTS:7.5',
          isMandatory: true,
          description: 'Minimum IELTS score of 7.5 overall with 7.0 in all bands or TOEFL 110.',
        },
        {
          category: 'AGE',
          operator: 'LTE',
          requiredValue: '35',
          isMandatory: false,
          description: 'Preference given to early-career scholars under age 35, though no strict upper limit.',
        },
        {
          category: 'FIELD',
          operator: 'IN',
          requiredValue: 'STEM,HUMANITIES,SOCIAL_SCIENCES',
          isMandatory: false,
          description: 'All fields offered at University of Cambridge are eligible.',
        },
      ],
    };

    mockAiProvider.setMockJson(JSON.stringify(mockOutput));

    const result = await requirementsService.extractRequirements(scholarship.id, 'user-ada-123');

    expect(result.scholarshipId).toBe(scholarship.id);
    expect(result.totalCount).toBe(6);
    expect(result.mandatoryCount).toBe(4);
    expect(result.preferredCount).toBe(2);
    expect(result.extractionSummary).toContain('Gates Cambridge requires exceptional academic merit');
    expect(result.requirements).toHaveLength(6);

    // Verify GPA requirement normalization
    const gpaReq = result.requirements.find((r) => r.category === 'GPA');
    expect(gpaReq).toBeDefined();
    expect(gpaReq.operator).toBe('GTE');
    expect(gpaReq.requiredValue).toBe('3.7');
    expect(gpaReq.isMandatory).toBe(true);

    // Verify Degree Level requirement
    const degreeReq = result.requirements.find((r) => r.category === 'DEGREE_LEVEL');
    expect(degreeReq).toBeDefined();
    expect(degreeReq.operator).toBe('EQ');
    expect(degreeReq.requiredValue).toBe('POSTGRADUATE');

    // Verify Preferred (Non-Mandatory) Age Requirement
    const ageReq = result.requirements.find((r) => r.category === 'AGE');
    expect(ageReq).toBeDefined();
    expect(ageReq.isMandatory).toBe(false);
    expect(ageReq.operator).toBe('LTE');

    // Verify AI audit metrics were populated
    expect(result.aiMetrics.model).toBe('gemini-1.5-pro');
    expect(result.aiMetrics.tokensUsed).toBe(1820);
  });

  it('blocks requirement extraction on scholarships flagged as SUSPICIOUS (Safety Enforcement)', async () => {
    const suspiciousScholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Fake International Grant 2026',
        providerName: 'Phishing Org',
        websiteUrl: 'https://fake-scam-grants.biz/win',
        verificationStatus: 'SUSPICIOUS',
        authenticityScore: 10,
        verificationSummary: 'Flagged as phishing scam: requires upfront payment fee.',
      },
    });

    await expect(
      requirementsService.extractRequirements(suspiciousScholarship.id)
    ).rejects.toThrowError(
      /Cannot extract requirements from a scholarship flagged as SUSPICIOUS/
    );
  });

  it('POST /api/v1/scholarships/:id/requirements/extract extracts requirements via API', async () => {
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'DAAD Helmut-Schmidt-Programme',
        providerName: 'DAAD Germany',
        websiteUrl: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/helmut-schmidt/',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 99,
        verificationSummary: 'Official German Academic Exchange Service scholarship for developing nations.',
      },
    });

    const mockOutput: ExtractedRequirementsOutput = {
      extractionSummary:
        'DAAD Helmut-Schmidt requires a Bachelor degree with above-average grades, development country citizenship, and relevant professional experience.',
      detectedEligibleTarget: 'Developing Nation Future Leaders',
      requirements: [
        {
          category: 'DEGREE_LEVEL',
          operator: 'EQ',
          requiredValue: 'UNDERGRADUATE',
          isMandatory: true,
          description: 'Must hold a completed Bachelor degree or equivalent before start.',
        },
        {
          category: 'NATIONALITY',
          operator: 'IN',
          requiredValue: 'DEVELOPING_COUNTRIES',
          isMandatory: true,
          description: 'Must be from a developing country listed on the DAC List of ODA Recipients.',
        },
        {
          category: 'LANGUAGE',
          operator: 'GTE',
          requiredValue: 'B2',
          isMandatory: true,
          description: 'English proficiency at least B2 level or German B2 depending on program.',
        },
      ],
    };

    mockAiProvider.setMockJson(JSON.stringify(mockOutput));

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/scholarships/${scholarship.id}/requirements/extract`,
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.totalCount).toBe(3);
    expect(body.data.mandatoryCount).toBe(3);
    expect(body.data.preferredCount).toBe(0);
    expect(body.data.requirements).toHaveLength(3);
  });

  it('POST /api/v1/scholarships/:id/requirements/extract returns 400 for SUSPICIOUS scholarship', async () => {
    const suspiciousScholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Direct Wire Prize Award',
        providerName: 'Scam Network',
        websiteUrl: 'https://scam-prize-win.top/claim',
        verificationStatus: 'SUSPICIOUS',
        authenticityScore: 12,
        verificationSummary: 'Flagged scam requesting banking info.',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/scholarships/${suspiciousScholarship.id}/requirements/extract`,
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('SCHOLARSHIP_SUSPICIOUS');
  });

  it('GET /api/v1/scholarships/:id/requirements lists existing requirements ordered by mandatory status', async () => {
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Rhodes Trust Scholarship 2026',
        providerName: 'Rhodes Trust Oxford',
        websiteUrl: 'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 99,
      },
    });

    // Add manual requirements via service
    await requirementsService.addManualRequirement(scholarship.id, {
      category: 'AGE',
      operator: 'LTE',
      requiredValue: '25',
      isMandatory: true,
      description: 'Must be aged 18-24 upon arrival at Oxford.',
    });

    await requirementsService.addManualRequirement(scholarship.id, {
      category: 'FIELD',
      operator: 'IN',
      requiredValue: 'ALL',
      isMandatory: false,
      description: 'Any full-time postgraduate course at Oxford.',
    });

    await requirementsService.addManualRequirement(scholarship.id, {
      category: 'GPA',
      operator: 'GTE',
      requiredValue: '3.7',
      isMandatory: true,
      description: 'First Class Honours or GPA above 3.7.',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/scholarships/${scholarship.id}/requirements`,
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(3);

    // Mandatory criteria should be sorted first
    expect(body.data[0].isMandatory).toBe(true);
    expect(body.data[1].isMandatory).toBe(true);
    expect(body.data[2].isMandatory).toBe(false);
  });

  it('POST /api/v1/scholarships/:id/requirements adds a manual requirement', async () => {
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'ETH Zurich Excellence Scholarship',
        providerName: 'ETH Zurich',
        websiteUrl: 'https://ethz.ch/en/studies/financial/excellence-scholarships.html',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 95,
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/scholarships/${scholarship.id}/requirements`,
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
      payload: {
        category: 'GPA',
        operator: 'GTE',
        requiredValue: 'Grade A',
        isMandatory: true,
        description: 'Result of Bachelor degree programme must be Grade A or top 10%.',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.category).toBe('GPA');
    expect(body.data.operator).toBe('GTE');
    expect(body.data.requiredValue).toBe('Grade A');
    expect(body.data.isMandatory).toBe(true);
  });

  it('POST /api/v1/scholarships/:id/requirements rejects invalid category or operator', async () => {
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Stanford Knight-Hennessy',
        providerName: 'Stanford University',
        websiteUrl: 'https://knight-hennessy.stanford.edu/',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 97,
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/scholarships/${scholarship.id}/requirements`,
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
      payload: {
        category: 'INVALID_CATEGORY',
        operator: 'INVALID_OP',
        requiredValue: 'value',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/v1/scholarships/requirements/:requirementId deletes a requirement', async () => {
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Chevening Scholarship 2026',
        providerName: 'FCDO Chevening UK',
        websiteUrl: 'https://www.chevening.org/scholarships/',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 98,
      },
    });

    const added = await requirementsService.addManualRequirement(scholarship.id, {
      category: 'FINANCIAL',
      operator: 'EQ',
      requiredValue: 'FULL_FUNDING',
      isMandatory: false,
      description: 'Fully funded grant covers flights, tuition, and stipend.',
    });

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/scholarships/requirements/${added.id}`,
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    expect(delRes.statusCode).toBe(200);
    const delBody = JSON.parse(delRes.body);
    expect(delBody.success).toBe(true);

    // Verify deleted
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/scholarships/${scholarship.id}/requirements`,
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });
    const getBody = JSON.parse(getRes.body);
    expect(getBody.data).toHaveLength(0);
  });
});
