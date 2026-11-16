import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { PrismaClient } from '@scholaris/database';

describe('Authentication Module (POST /auth/register, /login, /refresh, /me)', () => {
  let app: FastifyInstance;

  // In-memory mock database for isolated test execution
  const usersTable = new Map<string, any>();
  const profilesTable = new Map<string, any>();

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
    },
    $transaction: async (callback: any) => {
      return callback(mockPrisma);
    },
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  beforeAll(async () => {
    app = await buildApp();
    // Inject mock prisma
    app.prisma = mockPrisma;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  let savedAccessToken = '';
  let savedRefreshToken = '';

  it('POST /api/v1/auth/register creates user with hashed password and returns 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'student@example.com',
        password: 'Password123!',
        firstName: 'Dawit',
        lastName: 'Alemu',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('student@example.com');
    expect(body.data.user.role).toBe('STUDENT');
    expect(body.data.profile.fullName).toBe('Dawit Alemu');
    expect(body.data.tokens.accessToken).toBeDefined();
    expect(body.data.tokens.refreshToken).toBeDefined();

    savedAccessToken = body.data.tokens.accessToken;
    savedRefreshToken = body.data.tokens.refreshToken;
  });

  it('POST /api/v1/auth/register with duplicate email returns 409 Conflict', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'student@example.com',
        password: 'Password123!',
        firstName: 'Dawit',
        lastName: 'Alemu',
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('POST /api/v1/auth/register with invalid password fails validation with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'invalid@example.com',
        password: 'weak', // too short, no uppercase, no numbers
        firstName: 'Abebe',
        lastName: 'Bikila',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
  });

  it('POST /api/v1/auth/login with valid credentials returns 200 and new tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'student@example.com',
        password: 'Password123!',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('student@example.com');
    expect(body.data.tokens.accessToken).toBeDefined();

    savedAccessToken = body.data.tokens.accessToken;
  });

  it('POST /api/v1/auth/login with wrong password returns 401 Unauthorized', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'student@example.com',
        password: 'WrongPassword999!',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/auth/login with non-existent email returns 401 Unauthorized', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/auth/me without token returns 401 Unauthorized', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/auth/me with valid Bearer token returns 200 and student profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${savedAccessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('student@example.com');
    expect(body.data.profile.fullName).toBe('Dawit Alemu');
  });

  it('POST /api/v1/auth/refresh with valid refresh token returns new access token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: savedRefreshToken,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.expiresIn).toBe(900);
  });

  it('POST /api/v1/auth/refresh with invalid token returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: 'invalid.jwt.token',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
