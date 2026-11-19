import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { evaluateDomainCredibility } from '../src/modules/scholarships/domain-verifier.js';
import {
  ScholarshipVerificationService,
  ScholarshipVerificationOutput,
} from '../src/modules/scholarships/scholarship-verification.service.js';
import { ScholarshipFetcherService, FetchedWebContent } from '../src/modules/scholarships/scholarship-fetcher.service.js';
import { AIAuditService } from '../src/modules/ai/ai-audit.service.js';
import { BaseAIProvider, AIService, RawAIResponse, AIExecutionOptions } from '@scholaris/ai';
import { PrismaClient } from '@scholaris/database';

class MockVerificationAIProvider extends BaseAIProvider {
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
      promptTokens: 1200,
      completionTokens: 350,
      totalTokens: 1550,
    };
  }
}

describe('AI Authenticity Verification Engine (TASK-016)', () => {
  let app: FastifyInstance;

  // In-memory mock database
  const usersTable = new Map<string, any>();
  const scholarshipsTable = new Map<string, any>();
  const scholarshipSourcesTable = new Map<string, any>();
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
        const profile = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        return profile;
      },
    },
    scholarship: {
      findFirst: async ({ where }: any) => {
        const items = Array.from(scholarshipsTable.values());
        if (where.websiteUrl) {
          const found = items.find((s) => s.websiteUrl === where.websiteUrl);
          if (!found) return null;
          const sources = Array.from(scholarshipSourcesTable.values()).filter(
            (src) => src.scholarshipId === found.id
          );
          return { ...found, sources };
        }
        return null;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const found = scholarshipsTable.get(where.id);
        if (!found) return null;
        const sources = Array.from(scholarshipSourcesTable.values()).filter(
          (src) => src.scholarshipId === found.id
        );
        return { ...found, sources };
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const { sources, ...rest } = data;
        const record = {
          id,
          ...rest,
          createdAt: new Date(),
          updatedAt: new Date(),
          sources: [],
        };
        if (sources?.create) {
          const sourceId = randomUUID();
          const sourceRecord = {
            id: sourceId,
            scholarshipId: id,
            ...sources.create,
            createdAt: new Date(),
          };
          scholarshipSourcesTable.set(sourceId, sourceRecord);
          record.sources.push(sourceRecord);
        }
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
    scholarshipSource: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date() };
        scholarshipSourcesTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = scholarshipSourcesTable.get(where.id);
        if (!existing) throw new Error('Source not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        scholarshipSourcesTable.set(where.id, updated);
        return updated;
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

  class MockVerificationFetcher extends ScholarshipFetcherService {
    async fetchSafeContent(targetUrl: string): Promise<FetchedWebContent> {
      return {
        html: `<html><body>Extracted page for ${targetUrl}</body></html>`,
        cleanText: `Official information regarding ${targetUrl}`,
        title: 'Scholarship Details',
        finalUrl: targetUrl,
        statusCode: 200,
        contentLengthBytes: 250,
      };
    }
  }

  let testUserToken: string;
  let mockAiProvider: MockVerificationAIProvider;

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma;

    mockAiProvider = new MockVerificationAIProvider('GEMINI', 'gemini-1.5-flash');
    const customAiService = new AIService({}, mockAiProvider);
    const customAiAuditService = new AIAuditService(mockPrisma, customAiService);
    const customFetcher = new MockVerificationFetcher();

    (app as any).aiAuditService = customAiAuditService;
    (app as any).scholarshipFetcherService = customFetcher;

    // Register test student
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'verifier.student@oxford.ac.uk',
        password: 'Password123!',
        firstName: 'Grace',
        lastName: 'Hopper',
      },
    });

    const userBody = JSON.parse(userRes.body);
    testUserToken = userBody.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Domain Credibility Evaluator (domain-verifier.ts)', () => {
    it('classifies accredited university TLDs (.edu, .ac.uk, .edu.au) as ACADEMIC', () => {
      const ox = evaluateDomainCredibility('ox.ac.uk');
      expect(ox.category).toBe('ACADEMIC');
      expect(ox.isAcademicTld).toBe(true);
      expect(ox.baseCredibilityScore).toBeGreaterThanOrEqual(45);

      const harvard = evaluateDomainCredibility('scholarships.harvard.edu');
      expect(harvard.category).toBe('ACADEMIC');
      expect(harvard.isAcademicTld).toBe(true);

      const melbourne = evaluateDomainCredibility('unimelb.edu.au');
      expect(melbourne.category).toBe('ACADEMIC');
    });

    it('classifies government TLDs (.gov, .gov.uk, .europa.eu) as GOVERNMENT', () => {
      const gov = evaluateDomainCredibility('education.gov.uk');
      expect(gov.category).toBe('GOVERNMENT');
      expect(gov.isGovernmentTld).toBe(true);
      expect(gov.baseCredibilityScore).toBe(45);

      const eu = evaluateDomainCredibility('erasmus-plus.ec.europa.eu');
      expect(eu.isKnownScholarshipProvider || eu.isGovernmentTld).toBe(true);
    });

    it('recognizes verified international bodies (DAAD, Fulbright, Chevening, Rhodes)', () => {
      const daad = evaluateDomainCredibility('daad.de');
      expect(daad.category).toBe('VERIFIED_PROVIDER');
      expect(daad.isKnownScholarshipProvider).toBe(true);
      expect(daad.baseCredibilityScore).toBe(50);

      const chevening = evaluateDomainCredibility('chevening.org');
      expect(chevening.category).toBe('VERIFIED_PROVIDER');
      expect(chevening.isKnownScholarshipProvider).toBe(true);

      const rhodes = evaluateDomainCredibility('rhodeshouse.ox.ac.uk');
      expect(rhodes.category).toBe('VERIFIED_PROVIDER');
    });

    it('marks generic commercial or unverified domains as GENERAL', () => {
      const generic = evaluateDomainCredibility('free-scholarships-worldwide.com');
      expect(generic.category).toBe('GENERAL');
      expect(generic.baseCredibilityScore).toBe(10);
    });
  });

  describe('ScholarshipVerificationService Pipeline', () => {
    it('verifies legitimate university scholarship with VERIFIED status and high score', async () => {
      // Create pending scholarship in database
      const scholarship = await mockPrisma.scholarship.create({
        data: {
          title: 'Clarendon Fund Scholarship 2026',
          providerName: 'University of Oxford',
          websiteUrl: 'https://ox.ac.uk/clarendon',
          applicationUrl: 'https://ox.ac.uk/clarendon',
          verificationStatus: 'PENDING',
          verificationSummary: 'Full tuition and living grant funded by Oxford University Press.',
          sources: {
            create: {
              sourceUrl: 'https://ox.ac.uk/clarendon',
              sourceDomain: 'ox.ac.uk',
              institutionMatch: false,
              scamFlagsDetected: [],
            },
          },
        },
      });

      // AI response for verified scholarship
      const verifiedOutput: ScholarshipVerificationOutput = {
        status: 'VERIFIED',
        confidenceScore: 95,
        institutionMatch: true,
        scamFlags: [],
        summary:
          'Official University of Oxford Clarendon Scholarship. Fully corroborated on primary ox.ac.uk academic domain.',
        evidenceNotes:
          'No fees required. Clear academic eligibility criteria. Validated against official Oxford academic registry.',
        detectedDeadline: '2026-12-15',
        detectedFundingType: 'FULL',
      };
      mockAiProvider.setMockJson(JSON.stringify(verifiedOutput));

      const aiService = new AIService({}, mockAiProvider);
      const auditService = new AIAuditService(mockPrisma, aiService);
      const service = new ScholarshipVerificationService(mockPrisma, auditService, new MockVerificationFetcher());

      const result = await service.verifyScholarship(scholarship.id);

      expect(result.status).toBe('VERIFIED');
      expect(result.confidenceScore).toBe(95);
      expect(result.institutionMatch).toBe(true);
      expect(result.scamFlags).toEqual([]);
      expect(result.isEligibleForAutoFill).toBe(true);

      // Verify updated database state
      const updated = await mockPrisma.scholarship.findUnique({ where: { id: scholarship.id } });
      expect(updated?.verificationStatus).toBe('VERIFIED');
      expect(updated?.verificationScore).toBe(95);
      expect(updated?.fundingType).toBe('FULL');
      expect(updated?.deadline).toBeDefined();

      const source = updated?.sources[0];
      expect(source.institutionMatch).toBe(true);
      expect(source.scamFlagsDetected).toEqual([]);
    });

    it('identifies scam scholarship demanding upfront fee and enforces SUSPICIOUS + blocking auto-fill', async () => {
      const scamScholarship = await mockPrisma.scholarship.create({
        data: {
          title: 'International Student Merit Award',
          providerName: 'Global Foundation LLC',
          websiteUrl: 'https://global-scholarship-awards.net/apply',
          applicationUrl: 'https://global-scholarship-awards.net/apply',
          verificationStatus: 'PENDING',
          verificationSummary:
            'Guaranteed $25,000 scholarship. Please pay a non-refundable $75 application fee via Western Union or crypto to unlock your grant.',
          sources: {
            create: {
              sourceUrl: 'https://global-scholarship-awards.net/apply',
              sourceDomain: 'global-scholarship-awards.net',
              institutionMatch: false,
              scamFlagsDetected: [],
            },
          },
        },
      });

      const scamOutput: ScholarshipVerificationOutput = {
        status: 'SUSPICIOUS',
        confidenceScore: 12,
        institutionMatch: false,
        scamFlags: ['FEE_REQUIRED', 'UNREALISTIC_GUARANTEE'],
        summary: 'FRAUD ALERT: Demands $75 upfront application fee and promises guaranteed awards.',
        evidenceNotes: 'Legitimate scholarships never charge application fees to disburse awards.',
      };
      mockAiProvider.setMockJson(JSON.stringify(scamOutput));

      const aiService = new AIService({}, mockAiProvider);
      const auditService = new AIAuditService(mockPrisma, aiService);
      const service = new ScholarshipVerificationService(mockPrisma, auditService, new MockVerificationFetcher());

      const result = await service.verifyScholarship(scamScholarship.id);

      expect(result.status).toBe('SUSPICIOUS');
      expect(result.confidenceScore).toBeLessThanOrEqual(30);
      expect(result.scamFlags).toContain('FEE_REQUIRED');

      // MANDATORY SUBMISSION / AUTO-FILL SAFETY RULE:
      // Form filling must be STRICTLY PREVENTED for suspicious scholarships!
      expect(result.isEligibleForAutoFill).toBe(false);

      const updated = await mockPrisma.scholarship.findUnique({ where: { id: scamScholarship.id } });
      expect(updated?.verificationStatus).toBe('SUSPICIOUS');
      expect(updated?.verificationScore).toBeLessThanOrEqual(30);

      const source = updated?.sources[0];
      expect(source.scamFlagsDetected).toContain('FEE_REQUIRED');
    });

    it('classifies third-party directory without clear proof as UNCERTAIN', async () => {
      const uncertainScholarship = await mockPrisma.scholarship.create({
        data: {
          title: 'Community Leadership Bursary',
          providerName: 'Regional Youth Club',
          websiteUrl: 'https://local-leadership-blog.org/bursary',
          applicationUrl: 'https://local-leadership-blog.org/bursary',
          verificationStatus: 'PENDING',
          verificationSummary: 'Small regional bursary mentioned on community blog.',
          sources: {
            create: {
              sourceUrl: 'https://local-leadership-blog.org/bursary',
              sourceDomain: 'local-leadership-blog.org',
              institutionMatch: false,
              scamFlagsDetected: [],
            },
          },
        },
      });

      const uncertainOutput: ScholarshipVerificationOutput = {
        status: 'UNCERTAIN',
        confidenceScore: 55,
        institutionMatch: false,
        scamFlags: [],
        summary:
          'Informational listing on third-party blog. No scam detected, but institutional affiliation could not be verified.',
        evidenceNotes: 'Applicant should independently cross-verify with host organization.',
      };
      mockAiProvider.setMockJson(JSON.stringify(uncertainOutput));

      const aiService = new AIService({}, mockAiProvider);
      const auditService = new AIAuditService(mockPrisma, aiService);
      const service = new ScholarshipVerificationService(mockPrisma, auditService, new MockVerificationFetcher());

      const result = await service.verifyScholarship(uncertainScholarship.id);

      expect(result.status).toBe('UNCERTAIN');
      expect(result.confidenceScore).toBe(55);
      expect(result.isEligibleForAutoFill).toBe(true); // allowed with caution
    });
  });

  describe('HTTP Endpoints (POST /api/v1/scholarships/:id/verify)', () => {
    it('returns 401 Unauthorized without JWT token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/scholarships/${randomUUID()}/verify`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 for unknown scholarship UUID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/scholarships/${randomUUID()}/verify`,
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 200 OK with full verification report and updates database', async () => {
      // Ingest scholarship first
      const ingestRes = await app.inject({
        method: 'POST',
        url: '/api/v1/scholarships/analyze',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
        payload: {
          url: 'https://daad.de/en/study-and-research-in-germany/scholarships',
          title: 'DAAD Helmut-Schmidt-Programme',
          providerName: 'DAAD',
        },
      });

      const scholarshipId = JSON.parse(ingestRes.body).data.scholarship.id;

      const verifyOutput: ScholarshipVerificationOutput = {
        status: 'VERIFIED',
        confidenceScore: 98,
        institutionMatch: true,
        scamFlags: [],
        summary: 'Fully verified DAAD national scholarship on verified government portal.',
        evidenceNotes: 'German Academic Exchange Service official funding database.',
        detectedDeadline: '2026-10-31',
        detectedFundingType: 'FULL',
      };
      mockAiProvider.setMockJson(JSON.stringify(verifyOutput));

      const verifyRes = await app.inject({
        method: 'POST',
        url: `/api/v1/scholarships/${scholarshipId}/verify`,
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      });

      expect(verifyRes.statusCode).toBe(200);
      const body = JSON.parse(verifyRes.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('VERIFIED');
      expect(body.data.confidenceScore).toBe(98);
      expect(body.data.institutionMatch).toBe(true);
      expect(body.data.isEligibleForAutoFill).toBe(true);
      expect(body.data.aiMetrics).toBeDefined();
      expect(body.data.aiMetrics.model).toBe('gemini-1.5-flash');
    });
  });
});
