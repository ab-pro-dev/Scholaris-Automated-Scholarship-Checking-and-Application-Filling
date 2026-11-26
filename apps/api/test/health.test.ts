import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Health Check Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 OK and valid payload', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.appName).toBe('Scholaris');
    expect(body.version).toBe('0.1.0');
    expect(typeof body.uptimeSeconds).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });

  it('GET /api/v1/health returns 200 OK matching /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.appName).toBe('Scholaris');
  });

  it('returns 503 DATABASE_UNAVAILABLE without leaking file paths when DB is unreachable', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'db-down-check@scholaris.test',
        password: 'Password1!',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(body.error.message).not.toContain('/home/');
    expect(body.error.message).not.toContain('prisma.user.findUnique');
  });
});
