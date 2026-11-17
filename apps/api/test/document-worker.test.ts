import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import { PrismaClient } from '@scholaris/database';
import {
  DocumentExtractorService,
  DocumentExtractionError,
} from '../src/modules/documents/document-extractor.service.js';
import { processDocumentExtraction } from '../src/modules/documents/document.worker.js';
import { S3Service } from '../src/modules/documents/s3.service.js';

// Valid PDF buffer containing "Scholaris Academic Verification"
const VALID_SAMPLE_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT\n/F1 18 Tf\n10 100 Td\n(Scholaris Academic Verification) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000228 00000 n \n0000000334 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n407\n%%EOF'
);

// Corrupted binary buffer
const CORRUPT_SAMPLE_PDF = Buffer.from('NOT_A_VALID_PDF_BINARY_DATA_CORRUPT_123456789');

describe('Document Text & Metadata Extraction Worker', () => {
  const extractor = new DocumentExtractorService();

  // ==========================================
  // Unit Tests: Extractor Parser Logic
  // ==========================================

  it('extractText extracts structured text from valid PDF buffer', async () => {
    const result = await extractor.extractText(VALID_SAMPLE_PDF, 'application/pdf', 'sample.pdf');
    expect(result.text).toContain('Scholaris Academic Verification');
    expect(result.pageCount).toBe(1);
  });

  it('extractText handles image formats with multimodal AI placeholder', async () => {
    const fakeImageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const result = await extractor.extractText(fakeImageBuffer, 'image/png', 'passport.png');
    expect(result.text).toContain('passport.png');
    expect(result.text).toContain('Ready for Vision AI verification');
  });

  it('extractText throws DocumentExtractionError on corrupt PDF buffer', async () => {
    await expect(
      extractor.extractText(CORRUPT_SAMPLE_PDF, 'application/pdf', 'corrupt.pdf')
    ).rejects.toThrow(DocumentExtractionError);
  });

  it('extractText throws DocumentExtractionError on empty buffer', async () => {
    await expect(
      extractor.extractText(Buffer.alloc(0), 'application/pdf', 'empty.pdf')
    ).rejects.toThrow('Cannot extract text from an empty file buffer');
  });

  // ==========================================
  // Worker Pipeline Tests: processDocumentExtraction
  // ==========================================

  const documentsTable = new Map<string, any>();
  const mockS3Storage = new Map<string, Buffer>();

  const mockPrisma = {
    document: {
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = documentsTable.get(where.id);
        if (!existing) throw new Error('Document not found in test table');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        documentsTable.set(where.id, updated);
        return updated;
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const doc = documentsTable.get(where.id);
        if (doc && doc.userId === where.userId) return doc;
        return null;
      },
    },
  } as unknown as PrismaClient;

  const mockS3Service = {
    getObjectBuffer: async (fileKey: string): Promise<Buffer> => {
      const buf = mockS3Storage.get(fileKey);
      if (!buf) throw new Error(`S3 key not found: ${fileKey}`);
      return buf;
    },
    getPresignedUploadUrl: async () => 'http://localhost:9000/mock-upload',
    getPresignedDownloadUrl: async () => 'http://localhost:9000/mock-download',
    deleteObject: async () => {},
  } as unknown as S3Service;

  it('processDocumentExtraction updates status to COMPLETED and saves extracted text on success', async () => {
    const docId = randomUUID();
    const fileKey = `documents/user-123/${docId}-transcript.pdf`;

    documentsTable.set(docId, {
      id: docId,
      userId: 'user-123',
      name: 'transcript.pdf',
      category: 'TRANSCRIPT',
      fileKey,
      mimeType: 'application/pdf',
      ocrStatus: 'PENDING',
      extractedText: null,
    });

    mockS3Storage.set(fileKey, VALID_SAMPLE_PDF);

    const result = await processDocumentExtraction(
      {
        documentId: docId,
        fileKey,
        mimeType: 'application/pdf',
        name: 'transcript.pdf',
        userId: 'user-123',
      },
      mockPrisma,
      mockS3Service,
      extractor
    );

    expect(result.success).toBe(true);
    expect(result.textLength).toBeGreaterThan(0);

    const saved = documentsTable.get(docId);
    expect(saved.ocrStatus).toBe('COMPLETED');
    expect(saved.extractedText).toContain('Scholaris Academic Verification');
  });

  it('processDocumentExtraction updates status to FAILED gracefully when encountering corrupt file', async () => {
    const corruptDocId = randomUUID();
    const fileKey = `documents/user-123/${corruptDocId}-damaged.pdf`;

    documentsTable.set(corruptDocId, {
      id: corruptDocId,
      userId: 'user-123',
      name: 'damaged.pdf',
      category: 'TRANSCRIPT',
      fileKey,
      mimeType: 'application/pdf',
      ocrStatus: 'PENDING',
      extractedText: null,
    });

    mockS3Storage.set(fileKey, CORRUPT_SAMPLE_PDF);

    const result = await processDocumentExtraction(
      {
        documentId: corruptDocId,
        fileKey,
        mimeType: 'application/pdf',
        name: 'damaged.pdf',
        userId: 'user-123',
      },
      mockPrisma,
      mockS3Service,
      extractor
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    const saved = documentsTable.get(corruptDocId);
    expect(saved.ocrStatus).toBe('FAILED');
    expect(saved.extractedText).toBeNull();
  });

  // ==========================================
  // API Integration: Reprocess Endpoint & Cross-Tenant Safety
  // ==========================================

  let app: FastifyInstance;
  let tokenUserA: string;
  let tokenUserB: string;
  let docIdUserA: string;

  beforeAll(async () => {
    const usersTable = new Map<string, any>();
    const fullMockPrisma = {
      ...mockPrisma,
      user: {
        findUnique: async ({ where }: any) => {
          if (where.email) {
            return Array.from(usersTable.values()).find((u) => u.email === where.email) || null;
          }
          if (where.id) return usersTable.get(where.id) || null;
          return null;
        },
        create: async ({ data }: any) => {
          const id = randomUUID();
          const user = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          usersTable.set(id, user);
          return user;
        },
      },
      userProfile: {
        create: async ({ data }: any) => ({
          id: randomUUID(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      document: {
        ...mockPrisma.document,
        findFirst: async ({ where }: any) => {
          const doc = documentsTable.get(where.id);
          if (doc && doc.userId === where.userId) return doc;
          return null;
        },
        update: async ({ where, data }: any) => {
          const existing = documentsTable.get(where.id);
          const updated = { ...existing, ...data };
          documentsTable.set(where.id, updated);
          return updated;
        },
      },
      $transaction: async (cb: any) => cb(fullMockPrisma),
      $disconnect: async () => {},
    } as unknown as PrismaClient;

    app = await buildApp();
    app.prisma = fullMockPrisma;
    (app as any).s3Service = mockS3Service;
    await app.ready();

    // Register User A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'user.a.ocr@scholaris.test',
        password: 'Password123!',
        firstName: 'Anna',
        lastName: 'Kowalska',
      },
    });
    const bodyA = JSON.parse(resA.body);
    tokenUserA = bodyA.data.tokens.accessToken;
    const userIdA = bodyA.data.user.id;

    // Register User B
    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'user.b.ocr@scholaris.test',
        password: 'Password123!',
        firstName: 'Ben',
        lastName: 'Miller',
      },
    });
    tokenUserB = JSON.parse(resB.body).data.tokens.accessToken;

    // Seed document for User A
    docIdUserA = randomUUID();
    documentsTable.set(docIdUserA, {
      id: docIdUserA,
      userId: userIdA,
      name: 'academic_record.pdf',
      category: 'TRANSCRIPT',
      fileKey: `documents/${userIdA}/${docIdUserA}-record.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksum: 'sha-mock',
      ocrStatus: 'FAILED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/documents/:id/reprocess resets status to PENDING for document owner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${docIdUserA}/reprocess`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ocrStatus).toBe('PENDING');

    const inTable = documentsTable.get(docIdUserA);
    expect(inTable.ocrStatus).toBe('PENDING');
  });

  it('Cross-tenant: User B cannot reprocess User A document', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${docIdUserA}/reprocess`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
