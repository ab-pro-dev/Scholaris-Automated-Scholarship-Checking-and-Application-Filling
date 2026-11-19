import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { EligibilityMatcherService } from '../src/modules/scholarships/eligibility-matcher.service.js';
import { PrismaClient } from '@scholaris/database';

describe('Eligibility Matching & Scoring Service (TASK-019)', () => {
  let app: FastifyInstance;

  // In-memory mock tables
  const usersTable = new Map<string, any>();
  const userProfilesTable = new Map<string, any>();
  const educationRecordsTable = new Map<string, any>();
  const languageSkillsTable = new Map<string, any>();
  const achievementsTable = new Map<string, any>();
  const experiencesTable = new Map<string, any>();
  const scholarshipsTable = new Map<string, any>();
  const requirementsTable = new Map<string, any>();
  const eligibilityResultsTable = new Map<string, any>();

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
      findUnique: async ({ where }: { where: { userId: string } }) => {
        return userProfilesTable.get(where.userId) || null;
      },
      create: async ({ data }: { data: any }) => {
        const id = data.id || randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        userProfilesTable.set(data.userId, record);
        return record;
      },
      update: async ({ where, data }: { where: { userId: string }; data: any }) => {
        const existing = userProfilesTable.get(where.userId) || {};
        const record = { ...existing, ...data, updatedAt: new Date() };
        userProfilesTable.set(where.userId, record);
        return record;
      },
    },
    educationRecord: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(educationRecordsTable.values()).filter(
          (e) => e.userId === where.userId
        );
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        educationRecordsTable.set(id, record);
        return record;
      },
    },
    languageSkill: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(languageSkillsTable.values()).filter(
          (l) => l.userId === where.userId
        );
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        languageSkillsTable.set(id, record);
        return record;
      },
    },
    achievement: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(achievementsTable.values()).filter(
          (a) => a.userId === where.userId
        );
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date() };
        achievementsTable.set(id, record);
        return record;
      },
    },
    experience: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(experiencesTable.values()).filter(
          (e) => e.userId === where.userId
        );
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date() };
        experiencesTable.set(id, record);
        return record;
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
    },
    eligibilityRequirement: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date() };
        requirementsTable.set(id, record);
        return record;
      },
      findMany: async ({ where }: { where: { scholarshipId: string } }) => {
        return Array.from(requirementsTable.values()).filter(
          (r) => r.scholarshipId === where.scholarshipId
        );
      },
    },
    eligibilityResult: {
      findUnique: async ({ where }: any) => {
        const key = `${where.userId_scholarshipId.userId}_${where.userId_scholarshipId.scholarshipId}`;
        return eligibilityResultsTable.get(key) || null;
      },
      upsert: async ({ where, create, update }: any) => {
        const key = `${where.userId_scholarshipId.userId}_${where.userId_scholarshipId.scholarshipId}`;
        const existing = eligibilityResultsTable.get(key);
        if (existing) {
          const updated = {
            ...existing,
            ...update,
            evaluatedAt: new Date(),
          };
          eligibilityResultsTable.set(key, updated);
          return updated;
        }
        const id = randomUUID();
        const created = {
          id,
          ...create,
          evaluatedAt: new Date(),
        };
        eligibilityResultsTable.set(key, created);
        return created;
      },
    },
    $transaction: async (callback: any) => callback(mockPrisma),
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  let matcherService: EligibilityMatcherService;
  let testStudentId: string;
  let testStudentToken: string;

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma;

    matcherService = new EligibilityMatcherService(mockPrisma);

    // Register a test student user
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'scholar.candidate@eth.edu',
        password: 'Password123!',
        firstName: 'Elena',
        lastName: 'Rostova',
      },
    });

    const userBody = JSON.parse(userRes.body);
    testStudentToken = userBody.data.tokens.accessToken;
    testStudentId = userBody.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('evaluates student as ELIGIBLE with 100% score when meeting all criteria', async () => {
    // Populate student profile
    await mockPrisma.userProfile.create({
      data: {
        userId: testStudentId,
        firstName: 'Elena',
        lastName: 'Rostova',
        fullName: 'Elena Rostova',
        dateOfBirth: new Date('2001-05-15'), // ~25 years old
        nationality: 'Ethiopia',
        residenceCountry: 'Ethiopia',
        city: 'Addis Ababa',
        familyIncomeTier: 'LOW_INCOME',
      },
    });

    // Populate Education: Bachelor with 3.85 GPA
    await mockPrisma.educationRecord.create({
      data: {
        userId: testStudentId,
        level: 'UNDERGRADUATE',
        institution: 'Addis Ababa University',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: new Date('2020-09-01'),
        endDate: new Date('2024-06-30'),
        isCurrent: false,
        gpa: 3.85,
        maxGpa: 4.0,
      },
    });

    // Populate Language: IELTS 8.0
    await mockPrisma.languageSkill.create({
      data: {
        userId: testStudentId,
        language: 'English',
        isNative: false,
        testType: 'IELTS',
        testScore: '8.0',
        proficiencyLevel: 'C1',
      },
    });

    // Create scholarship with 5 criteria
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Master in AI International Fellowship',
        providerName: 'Global AI Trust',
        websiteUrl: 'https://ai-fellowship.edu/apply',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 99,
      },
    });

    // Requirements
    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'GPA',
        operator: 'GTE',
        requiredValue: '3.5',
        isMandatory: true,
        description: 'Minimum undergraduate GPA of 3.5.',
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'AGE',
        operator: 'LTE',
        requiredValue: '30',
        isMandatory: true,
        description: 'Must be 30 years or younger.',
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'DEGREE_LEVEL',
        operator: 'EQ',
        requiredValue: 'POSTGRADUATE',
        isMandatory: true,
        description: 'Requires Bachelor degree for entry into master program.',
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'NATIONALITY',
        operator: 'IN',
        requiredValue: 'NON_UK_INTERNATIONAL',
        isMandatory: true,
        description: 'Open to international students outside the UK.',
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'LANGUAGE',
        operator: 'GTE',
        requiredValue: 'IELTS:7.5',
        isMandatory: true,
        description: 'Minimum IELTS score of 7.5.',
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'FIELD',
        operator: 'IN',
        requiredValue: 'Computer Science,STEM',
        isMandatory: false,
        description: 'Preference given to Computer Science or STEM majors.',
      },
    });

    const result = await matcherService.evaluateEligibility(scholarship.id, testStudentId);

    expect(result.status).toBe('ELIGIBLE');
    expect(result.score).toBe(100);
    expect(result.criteriaBreakdown).toHaveLength(6);
    expect(result.summary?.satisfiedCount).toBe(6);
    expect(result.summary?.failedCount).toBe(0);
    expect(result.summary?.unconfirmedCount).toBe(0);
    expect(result.summary?.mandatorySatisfied).toBe(5);
    expect(result.summary?.mandatoryTotal).toBe(5);
    expect(result.summary?.summary).toContain('Congratulations! You meet all 5 mandatory eligibility criteria');
  });

  it('evaluates student as INELIGIBLE when a mandatory requirement fails (GPA below minimum)', async () => {
    // Create new student with GPA 3.1
    const lowGpaUser = await mockPrisma.user.create({
      data: {
        email: 'low.gpa@cambridge.ac.uk',
        passwordHash: 'hashed',
        role: 'STUDENT',
      },
    });

    await mockPrisma.userProfile.create({
      data: {
        userId: lowGpaUser.id,
        firstName: 'Marcus',
        lastName: 'Bell',
        fullName: 'Marcus Bell',
        dateOfBirth: new Date('2002-01-01'),
        nationality: 'Ghana',
      },
    });

    await mockPrisma.educationRecord.create({
      data: {
        userId: lowGpaUser.id,
        level: 'UNDERGRADUATE',
        institution: 'University of Ghana',
        fieldOfStudy: 'Economics',
        startDate: new Date('2020-09-01'),
        gpa: 3.1,
        maxGpa: 4.0,
      },
    });

    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'High Distinction Fellowship',
        providerName: 'Excellence Fund',
        websiteUrl: 'https://excellence-fund.org/apply',
        verificationStatus: 'OFFICIAL',
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'GPA',
        operator: 'GTE',
        requiredValue: '3.7',
        isMandatory: true,
        description: 'Minimum GPA of 3.7 required.',
      },
    });

    const result = await matcherService.evaluateEligibility(scholarship.id, lowGpaUser.id);

    expect(result.status).toBe('INELIGIBLE');
    expect(result.summary?.failedCount).toBe(1);
    expect(result.summary?.mandatorySatisfied).toBe(0);

    const gpaCheck = result.criteriaBreakdown.find((c) => c.category === 'GPA');
    expect(gpaCheck).toBeDefined();
    expect(gpaCheck?.isMet).toBe(false);
    expect(gpaCheck?.explanation).toContain('is below the required benchmark of 3.7');
  });

  it('evaluates student as INELIGIBLE when age limit is exceeded', async () => {
    const matureUser = await mockPrisma.user.create({
      data: {
        email: 'mature.scholar@alumni.org',
        passwordHash: 'hashed',
        role: 'STUDENT',
      },
    });

    await mockPrisma.userProfile.create({
      data: {
        userId: matureUser.id,
        firstName: 'Alan',
        lastName: 'Turing',
        fullName: 'Alan Turing',
        dateOfBirth: new Date('1990-01-01'), // 36 years old
        nationality: 'Canada',
      },
    });

    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Youth Leadership Award 2026',
        providerName: 'Youth Foundation',
        websiteUrl: 'https://youth-award.org/apply',
        verificationStatus: 'OFFICIAL',
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'AGE',
        operator: 'LTE',
        requiredValue: '28',
        isMandatory: true,
        description: 'Applicants must be 28 or younger.',
      },
    });

    const result = await matcherService.evaluateEligibility(scholarship.id, matureUser.id);

    expect(result.status).toBe('INELIGIBLE');
    const ageCheck = result.criteriaBreakdown.find((c) => c.category === 'AGE');
    expect(ageCheck?.isMet).toBe(false);
    expect(ageCheck?.explanation).toContain('does not meet the requirement of LTE 28');
  });

  it('evaluates student as INSUFFICIENT_INFO when critical mandatory data is missing', async () => {
    const incompleteUser = await mockPrisma.user.create({
      data: {
        email: 'newbie.student@empty.com',
        passwordHash: 'hashed',
        role: 'STUDENT',
      },
    });

    // Profile without DOB or Education or Languages
    await mockPrisma.userProfile.create({
      data: {
        userId: incompleteUser.id,
        firstName: 'Sam',
        lastName: 'New',
        fullName: 'Sam New',
        nationality: 'Nigeria',
      },
    });

    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Comprehensive Merit Grant',
        providerName: 'Global Foundation',
        websiteUrl: 'https://global-foundation.org/grant',
        verificationStatus: 'OFFICIAL',
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'GPA',
        operator: 'GTE',
        requiredValue: '3.5',
        isMandatory: true,
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'LANGUAGE',
        operator: 'GTE',
        requiredValue: 'IELTS:7.0',
        isMandatory: true,
      },
    });

    const result = await matcherService.evaluateEligibility(scholarship.id, incompleteUser.id);

    expect(result.status).toBe('INSUFFICIENT_INFO');
    expect(result.summary?.unconfirmedCount).toBe(2);
    expect(result.summary?.missingProfileFields).toContain('EDUCATION_GPA');
    expect(result.summary?.missingProfileFields).toContain('IELTS_TEST_SCORE');
    expect(result.summary?.summary).toContain('Unable to verify full eligibility');
  });

  it('blocks evaluation on SUSPICIOUS scholarships for security', async () => {
    const suspiciousScholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Wire Scam Grant',
        providerName: 'Fraud Syndicate',
        websiteUrl: 'https://fraud-wire-grant.biz',
        verificationStatus: 'SUSPICIOUS',
        authenticityScore: 8,
      },
    });

    await expect(
      matcherService.evaluateEligibility(suspiciousScholarship.id, testStudentId)
    ).rejects.toThrowError(
      /Cannot evaluate eligibility on a scholarship flagged as SUSPICIOUS/
    );
  });

  it('POST /api/v1/scholarships/:id/eligibility/check evaluates eligibility via API', async () => {
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Oxford Clarendon Fund',
        providerName: 'University of Oxford',
        websiteUrl: 'https://www.ox.ac.uk/clarendon',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 100,
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'DEGREE_LEVEL',
        operator: 'EQ',
        requiredValue: 'POSTGRADUATE',
        isMandatory: true,
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/scholarships/${scholarship.id}/eligibility/check`,
      headers: {
        Authorization: `Bearer ${testStudentToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.scholarshipId).toBe(scholarship.id);
    expect(body.data.status).toBe('ELIGIBLE');
    expect(body.data.score).toBe(100);
    expect(body.data.criteriaBreakdown).toHaveLength(1);
  });

  it('GET /api/v1/scholarships/:id/eligibility retrieves previously computed evaluation', async () => {
    const scholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Stanford Graduate Fellowship',
        providerName: 'Stanford University',
        websiteUrl: 'https://vpge.stanford.edu/fellowships-funding/sgf',
        verificationStatus: 'OFFICIAL',
        authenticityScore: 98,
      },
    });

    await mockPrisma.eligibilityRequirement.create({
      data: {
        scholarshipId: scholarship.id,
        category: 'GPA',
        operator: 'GTE',
        requiredValue: '3.6',
        isMandatory: true,
      },
    });

    // Check first
    await app.inject({
      method: 'POST',
      url: `/api/v1/scholarships/${scholarship.id}/eligibility/check`,
      headers: {
        Authorization: `Bearer ${testStudentToken}`,
      },
    });

    // Retrieve
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/scholarships/${scholarship.id}/eligibility`,
      headers: {
        Authorization: `Bearer ${testStudentToken}`,
      },
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.success).toBe(true);
    expect(getBody.data.scholarshipId).toBe(scholarship.id);
    expect(getBody.data.status).toBe('ELIGIBLE');
  });

  it('GET /api/v1/scholarships/:id/eligibility returns 404 when no evaluation exists', async () => {
    const unCheckedScholarship = await mockPrisma.scholarship.create({
      data: {
        title: 'Unchecked MIT Award',
        providerName: 'MIT',
        websiteUrl: 'https://mit.edu/awards',
        verificationStatus: 'OFFICIAL',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/scholarships/${unCheckedScholarship.id}/eligibility`,
      headers: {
        Authorization: `Bearer ${testStudentToken}`,
      },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
