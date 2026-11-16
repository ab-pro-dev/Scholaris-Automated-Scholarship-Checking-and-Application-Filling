import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { PrismaClient } from '@scholaris/database';

describe('Student Profile Module (/api/v1/profile)', () => {
  let app: FastifyInstance;

  // In-memory mock database for profiles and related sub-entities
  const usersTable = new Map<string, any>();
  const profilesTable = new Map<string, any>();
  const educationTable = new Map<string, any>();
  const languagesTable = new Map<string, any>();
  const achievementsTable = new Map<string, any>();
  const experiencesTable = new Map<string, any>();

  const mockPrisma = {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          const user = Array.from(usersTable.values()).find((u) => u.email === where.email);
          if (!user) return null;
          const profile = profilesTable.get(user.id) || null;
          return { ...user, profile };
        }
        if (where.id) {
          const user = usersTable.get(where.id);
          if (!user) return null;
          const profile = profilesTable.get(user.id) || null;
          return { ...user, profile };
        }
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const user = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersTable.set(id, user);
        return user;
      },
    },
    userProfile: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const profile = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        profilesTable.set(data.userId, profile);
        return profile;
      },
      findUnique: async ({ where }: { where: { userId?: string; id?: string } }) => {
        if (where.userId) {
          return profilesTable.get(where.userId) || null;
        }
        return null;
      },
      update: async ({ where, data }: { where: { userId?: string }; data: any }) => {
        const existing = profilesTable.get(where.userId!);
        if (!existing) throw new Error('Not found');
        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        profilesTable.set(where.userId!, updated);
        return updated;
      },
    },
    educationRecord: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(educationTable.values()).filter((e) => e.userId === where.userId);
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const item = educationTable.get(where.id);
        if (item && item.userId === where.userId) return item;
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data };
        educationTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = educationTable.get(where.id);
        const updated = { ...existing, ...data };
        educationTable.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const existing = educationTable.get(where.id);
        educationTable.delete(where.id);
        return existing;
      },
    },
    languageSkill: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(languagesTable.values()).filter((l) => l.userId === where.userId);
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const item = languagesTable.get(where.id);
        if (item && item.userId === where.userId) return item;
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data };
        languagesTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = languagesTable.get(where.id);
        const updated = { ...existing, ...data };
        languagesTable.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const existing = languagesTable.get(where.id);
        languagesTable.delete(where.id);
        return existing;
      },
    },
    achievement: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(achievementsTable.values()).filter((a) => a.userId === where.userId);
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const item = achievementsTable.get(where.id);
        if (item && item.userId === where.userId) return item;
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data };
        achievementsTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = achievementsTable.get(where.id);
        const updated = { ...existing, ...data };
        achievementsTable.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const existing = achievementsTable.get(where.id);
        achievementsTable.delete(where.id);
        return existing;
      },
    },
    experience: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(experiencesTable.values()).filter((e) => e.userId === where.userId);
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const item = experiencesTable.get(where.id);
        if (item && item.userId === where.userId) return item;
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = { id, ...data };
        experiencesTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = experiencesTable.get(where.id);
        const updated = { ...existing, ...data };
        experiencesTable.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const existing = experiencesTable.get(where.id);
        experiencesTable.delete(where.id);
        return existing;
      },
    },
    $transaction: async (callback: any) => {
      return callback(mockPrisma);
    },
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  let tokenUserA: string;
  let tokenUserB: string;

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma;
    await app.ready();

    // Register User A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'user.a@scholaris.test',
        password: 'Password123!',
        firstName: 'Alice',
        lastName: 'Smith',
      },
    });
    tokenUserA = JSON.parse(resA.body).data.tokens.accessToken;

    // Register User B (for tenant isolation tests)
    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'user.b@scholaris.test',
        password: 'Password123!',
        firstName: 'Bob',
        lastName: 'Jones',
      },
    });
    tokenUserB = JSON.parse(resB.body).data.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // Auth Protection Tests
  // ==========================================

  it('GET /api/v1/profile returns 401 Unauthorized when missing Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/profile',
    });
    expect(res.statusCode).toBe(401);
  });

  // ==========================================
  // Basic Profile Tests
  // ==========================================

  it('GET /api/v1/profile returns initial profile for User A', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.profile.fullName).toBe('Alice Smith');
    expect(body.data.profile.nationality).toBe('Unknown');
    expect(body.data.education).toEqual([]);
    expect(body.data.languages).toEqual([]);
    expect(body.data.achievements).toEqual([]);
    expect(body.data.experiences).toEqual([]);
  });

  it('PATCH /api/v1/profile updates contact, personal details and recalculates full name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        firstName: 'Alice',
        middleName: 'Marie',
        lastName: 'Smith',
        nationality: 'Ethiopian',
        residenceCountry: 'Ethiopia',
        city: 'Addis Ababa',
        phone: '+251911223344',
        gender: 'FEMALE',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.fullName).toBe('Alice Marie Smith');
    expect(body.data.nationality).toBe('Ethiopian');
    expect(body.data.city).toBe('Addis Ababa');
    expect(body.data.phone).toBe('+251911223344');
    expect(body.data.gender).toBe('FEMALE');
  });

  // ==========================================
  // Education CRUD & Tenant Isolation
  // ==========================================

  let createdEducationId: string;

  it('POST /api/v1/profile/education creates an education record for User A', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profile/education',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        level: 'UNDERGRADUATE',
        institution: 'Addis Ababa University',
        fieldOfStudy: 'Computer Science',
        degree: 'Bachelor of Science',
        startDate: '2020-09-01',
        endDate: '2024-07-15',
        isCurrent: false,
        gpa: 3.85,
        maxGpa: 4.0,
        honors: 'Summa Cum Laude',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.institution).toBe('Addis Ababa University');
    expect(body.data.fieldOfStudy).toBe('Computer Science');
    expect(body.data.gpa).toBe(3.85);
    createdEducationId = body.data.id;
  });

  it('GET /api/v1/profile/education lists education for User A and does not leak to User B', async () => {
    // User A should see 1 record
    const resA = await app.inject({
      method: 'GET',
      url: '/api/v1/profile/education',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(resA.statusCode).toBe(200);
    const bodyA = JSON.parse(resA.body);
    expect(bodyA.data.length).toBe(1);
    expect(bodyA.data[0].id).toBe(createdEducationId);

    // User B should see 0 records
    const resB = await app.inject({
      method: 'GET',
      url: '/api/v1/profile/education',
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    expect(resB.statusCode).toBe(200);
    const bodyB = JSON.parse(resB.body);
    expect(bodyB.data.length).toBe(0);
  });

  it('Cross-tenant check: User B cannot modify or delete User A education record', async () => {
    // Attempt update by User B
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/profile/education/${createdEducationId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { gpa: 2.0 },
    });
    expect(updateRes.statusCode).toBe(404);

    // Attempt delete by User B
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/profile/education/${createdEducationId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    expect(deleteRes.statusCode).toBe(404);
  });

  it('PATCH /api/v1/profile/education/:id updates User A education record', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/profile/education/${createdEducationId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { gpa: 3.9 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.gpa).toBe(3.9);
  });

  // ==========================================
  // Language Skill CRUD & Isolation
  // ==========================================

  let createdLangId: string;

  it('POST /api/v1/profile/languages creates language skill', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profile/languages',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        language: 'English',
        isNative: false,
        proficiencyLevel: 'C1 Fluent',
        testType: 'IELTS',
        testScore: '8.0',
        testDate: '2023-11-10',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.language).toBe('English');
    expect(body.data.testScore).toBe('8.0');
    createdLangId = body.data.id;
  });

  it('Cross-tenant check: User B cannot delete User A language skill', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/profile/languages/${createdLangId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    expect(res.statusCode).toBe(404);
  });

  // ==========================================
  // Achievement CRUD & Isolation
  // ==========================================

  let createdAchId: string;

  it('POST /api/v1/profile/achievements creates achievement record', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profile/achievements',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        title: 'National Coding Championship Winner',
        issuer: 'Ministry of Innovation & Technology',
        dateReceived: '2023-05-20',
        description: 'First place out of 2,000 collegiate participants.',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('National Coding Championship Winner');
    createdAchId = body.data.id;
  });

  it('Cross-tenant check: User B cannot modify User A achievement', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/profile/achievements/${createdAchId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { title: 'Hacked Title' },
    });
    expect(res.statusCode).toBe(404);
  });

  // ==========================================
  // Experience CRUD & Isolation
  // ==========================================

  let createdExpId: string;

  it('POST /api/v1/profile/experiences creates experience record', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profile/experiences',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        type: 'RESEARCH',
        organization: 'AI Research Institute',
        roleTitle: 'Undergraduate Research Assistant',
        startDate: '2023-01-15',
        isCurrent: true,
        description: 'Researching multilingual NLP pipelines and knowledge graphs.',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.roleTitle).toBe('Undergraduate Research Assistant');
    expect(body.data.isCurrent).toBe(true);
    createdExpId = body.data.id;
  });

  it('Cross-tenant check: User B cannot modify User A experience', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/profile/experiences/${createdExpId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { roleTitle: 'Hacked Role' },
    });
    expect(res.statusCode).toBe(404);
  });

  // ==========================================
  // Full Aggregate Profile Verification
  // ==========================================

  it('GET /api/v1/profile returns aggregated profile with all sub-records for User A', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.profile.fullName).toBe('Alice Marie Smith');
    expect(body.data.education.length).toBe(1);
    expect(body.data.languages.length).toBe(1);
    expect(body.data.achievements.length).toBe(1);
    expect(body.data.experiences.length).toBe(1);
  });

  // ==========================================
  // Deletion Cleanup Tests
  // ==========================================

  it('DELETE /api/v1/profile/education/:id deletes education record for User A', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/profile/education/${createdEducationId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(res.statusCode).toBe(200);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/profile/education',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(JSON.parse(listRes.body).data.length).toBe(0);
  });

  it('DELETE /api/v1/profile/languages/:id deletes language skill for User A', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/profile/languages/${createdLangId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('DELETE /api/v1/profile/achievements/:id deletes achievement for User A', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/profile/achievements/${createdAchId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('DELETE /api/v1/profile/experiences/:id deletes experience for User A', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/profile/experiences/${createdExpId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
