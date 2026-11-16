import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { PrismaClient } from '@scholaris/database';

describe('Document Vault & S3 Upload Service (/api/v1/documents)', () => {
  let app: FastifyInstance;

  // In-memory mock database for users, profiles, and documents
  const usersTable = new Map<string, any>();
  const profilesTable = new Map<string, any>();
  const documentsTable = new Map<string, any>();

  // Mock S3 Service tracking uploaded and deleted files
  const mockS3Storage = new Set<string>();

  const mockS3Service = {
    getPresignedUploadUrl: async (fileKey: string, mimeType: string, expiresIn = 900) => {
      mockS3Storage.add(fileKey);
      return `http://localhost:9000/scholaris-documents/${fileKey}?X-Amz-Signature=mock-sig-upload&expires=${expiresIn}&mime=${encodeURIComponent(mimeType)}`;
    },
    getPresignedDownloadUrl: async (fileKey: string, expiresIn = 300, filename?: string) => {
      return `http://localhost:9000/scholaris-documents/${fileKey}?X-Amz-Signature=mock-sig-download&expires=${expiresIn}&filename=${encodeURIComponent(filename || '')}`;
    },
    deleteObject: async (fileKey: string) => {
      mockS3Storage.delete(fileKey);
    },
    checkObjectExists: async (fileKey: string) => {
      return mockS3Storage.has(fileKey);
    },
  };

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
    document: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const doc = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        documentsTable.set(id, doc);
        return doc;
      },
      findMany: async ({ where }: { where: { userId: string; category?: string } }) => {
        return Array.from(documentsTable.values()).filter((doc) => {
          if (doc.userId !== where.userId) return false;
          if (where.category && doc.category !== where.category) return false;
          return true;
        });
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const doc = documentsTable.get(where.id);
        if (doc && doc.userId === where.userId) return doc;
        return null;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const doc = documentsTable.get(where.id);
        documentsTable.delete(where.id);
        return doc;
      },
    },
    $transaction: async (callback: any) => {
      return callback(mockPrisma);
    },
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  let tokenUserA: string;
  let userIdA: string;
  let tokenUserB: string;
  let userIdB: string;

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma;
    (app as any).s3Service = mockS3Service;
    await app.ready();

    // Register User A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'student.doc.a@scholaris.test',
        password: 'Password123!',
        firstName: 'Elena',
        lastName: 'Rostova',
      },
    });
    const bodyA = JSON.parse(resA.body);
    tokenUserA = bodyA.data.tokens.accessToken;
    userIdA = bodyA.data.user.id;

    // Register User B
    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'student.doc.b@scholaris.test',
        password: 'Password123!',
        firstName: 'Marcus',
        lastName: 'Vance',
      },
    });
    const bodyB = JSON.parse(resB.body);
    tokenUserB = bodyB.data.tokens.accessToken;
    userIdB = bodyB.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // Auth Verification
  // ==========================================

  it('POST /api/v1/documents/presigned-upload returns 401 Unauthorized without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/presigned-upload',
      payload: {
        filename: 'transcript.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 1024,
        category: 'TRANSCRIPT',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  // ==========================================
  // Presigned Upload Generation
  // ==========================================

  let fileKeyUserA: string;

  it('POST /api/v1/documents/presigned-upload generates valid S3 PUT URL and scoped fileKey', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/presigned-upload',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        filename: 'official_transcript.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2 * 1024 * 1024, // 2MB
        category: 'TRANSCRIPT',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.uploadUrl).toContain('http://localhost:9000/scholaris-documents/');
    expect(body.data.uploadUrl).toContain('official_transcript.pdf');
    expect(body.data.fileKey).toMatch(new RegExp(`^documents/${userIdA}/`));
    expect(body.data.expiresInSeconds).toBe(900);

    fileKeyUserA = body.data.fileKey;
  });

  it('POST /api/v1/documents/presigned-upload rejects disallowed file size (> 10MB)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/presigned-upload',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        filename: 'massive_video.mp4',
        mimeType: 'application/pdf',
        sizeBytes: 15 * 1024 * 1024, // 15MB (> 10MB limit)
        category: 'TRANSCRIPT',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ==========================================
  // Confirm Upload & Tenant Security
  // ==========================================

  it('Cross-tenant: User B cannot confirm an upload using User A fileKey', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/confirm-upload',
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: {
        fileKey: fileKeyUserA, // Belongs to User A
        name: 'Stolen Transcript.pdf',
        category: 'TRANSCRIPT',
        mimeType: 'application/pdf',
        sizeBytes: 2 * 1024 * 1024,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  let createdDocumentId: string;

  it('POST /api/v1/documents/confirm-upload records document in DB with OCRStatus PENDING', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/confirm-upload',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        fileKey: fileKeyUserA,
        name: 'Official Academic Transcript.pdf',
        category: 'TRANSCRIPT',
        mimeType: 'application/pdf',
        sizeBytes: 2 * 1024 * 1024,
        checksum: 'sha256-mock-checksum-12345',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Official Academic Transcript.pdf');
    expect(body.data.category).toBe('TRANSCRIPT');
    expect(body.data.ocrStatus).toBe('PENDING');
    expect(body.data.userId).toBe(userIdA);
    createdDocumentId = body.data.id;
  });

  // ==========================================
  // List Documents & Filtering
  // ==========================================

  it('GET /api/v1/documents lists User A documents and does not leak to User B', async () => {
    // User A should see 1 document
    const resA = await app.inject({
      method: 'GET',
      url: '/api/v1/documents',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(resA.statusCode).toBe(200);
    const bodyA = JSON.parse(resA.body);
    expect(bodyA.data.length).toBe(1);
    expect(bodyA.data[0].id).toBe(createdDocumentId);

    // User B should see 0 documents
    const resB = await app.inject({
      method: 'GET',
      url: '/api/v1/documents',
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    expect(resB.statusCode).toBe(200);
    const bodyB = JSON.parse(resB.body);
    expect(bodyB.data.length).toBe(0);
  });

  it('GET /api/v1/documents?category=TRANSCRIPT filters correctly', async () => {
    const resMatch = await app.inject({
      method: 'GET',
      url: '/api/v1/documents?category=TRANSCRIPT',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(JSON.parse(resMatch.body).data.length).toBe(1);

    const resNoMatch = await app.inject({
      method: 'GET',
      url: '/api/v1/documents?category=CV',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(JSON.parse(resNoMatch.body).data.length).toBe(0);
  });

  // ==========================================
  // Download Presigned URL & Isolation
  // ==========================================

  it('GET /api/v1/documents/:id/download returns presigned download URL for User A', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/documents/${createdDocumentId}/download`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.downloadUrl).toContain('mock-sig-download');
    expect(body.data.expiresInSeconds).toBe(300);
    expect(body.data.document.id).toBe(createdDocumentId);
  });

  it('Cross-tenant: User B cannot get download URL for User A document', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/documents/${createdDocumentId}/download`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });

    expect(res.statusCode).toBe(404);
  });

  // ==========================================
  // Deletion & Cross-Tenant Safety
  // ==========================================

  it('Cross-tenant: User B cannot delete User A document', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/documents/${createdDocumentId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('DELETE /api/v1/documents/:id deletes document from S3 and database for User A', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/documents/${createdDocumentId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Document deleted successfully');

    // Confirm list is now empty
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/documents',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(JSON.parse(listRes.body).data.length).toBe(0);
  });
});
