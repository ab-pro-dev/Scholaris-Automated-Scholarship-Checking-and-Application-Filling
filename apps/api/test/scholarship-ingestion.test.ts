import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { buildApp } from '../src/app.js';
import {
  validateUrlForSSRF,
  isPrivateOrReservedIPv4,
  isPrivateOrReservedIPv6,
  SSRFProtectionError,
} from '../src/modules/scholarships/ssrf-validator.js';
import {
  ScholarshipFetcherService,
  FetchedWebContent,
} from '../src/modules/scholarships/scholarship-fetcher.service.js';
import { ScholarshipService } from '../src/modules/scholarships/scholarship.service.js';
import { PrismaClient } from '@scholaris/database';

describe('Scholarship Ingestion & SSRF Protection (TASK-015)', () => {
  let app: FastifyInstance;

  // In-memory mock database
  const usersTable = new Map<string, any>();
  const profilesTable = new Map<string, any>();
  const scholarshipsTable = new Map<string, any>();
  const scholarshipSourcesTable = new Map<string, any>();

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
        profilesTable.set(data.userId, profile);
        return profile;
      },
    },
    scholarship: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const { sources, ...rest } = data;
        const record = {
          id,
          ...rest,
          createdAt: new Date(),
          updatedAt: new Date(),
          sources: [],
          requirements: [],
        };

        if (sources?.create) {
          const sourceData = sources.create;
          const sourceId = randomUUID();
          const sourceRecord = {
            id: sourceId,
            scholarshipId: id,
            ...sourceData,
            createdAt: new Date(),
          };
          scholarshipSourcesTable.set(sourceId, sourceRecord);
          record.sources.push(sourceRecord);
        }

        scholarshipsTable.set(id, record);
        return record;
      },
      findFirst: async ({ where }: any) => {
        const items = Array.from(scholarshipsTable.values());
        if (where.websiteUrl) {
          const found = items.find((s) => s.websiteUrl === where.websiteUrl);
          if (!found) return null;
          const sources = Array.from(scholarshipSourcesTable.values()).filter(
            (src) => src.scholarshipId === found.id
          );
          return { ...found, sources, requirements: found.requirements || [] };
        }
        return null;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const found = scholarshipsTable.get(where.id);
        if (!found) return null;
        const sources = Array.from(scholarshipSourcesTable.values()).filter(
          (src) => src.scholarshipId === found.id
        );
        return { ...found, sources, requirements: found.requirements || [] };
      },
      findMany: async ({ where, skip = 0, take = 50 }: any = {}) => {
        let results = Array.from(scholarshipsTable.values());
        if (where?.verificationStatus) {
          results = results.filter((s) => s.verificationStatus === where.verificationStatus);
        }
        return results.slice(skip, skip + take).map((s) => {
          const sources = Array.from(scholarshipSourcesTable.values()).filter(
            (src) => src.scholarshipId === s.id
          );
          return { ...s, sources, requirements: s.requirements || [] };
        });
      },
      count: async ({ where }: any = {}) => {
        let results = Array.from(scholarshipsTable.values());
        if (where?.verificationStatus) {
          results = results.filter((s) => s.verificationStatus === where.verificationStatus);
        }
        return results.length;
      },
    },
    scholarshipSource: {
      create: async ({ data }: { data: any }) => {
        const id = randomUUID();
        const record = {
          id,
          ...data,
          createdAt: new Date(),
        };
        scholarshipSourcesTable.set(id, record);
        return record;
      },
    },
    $transaction: async (callback: any) => callback(mockPrisma),
    $disconnect: async () => {},
  } as unknown as PrismaClient;

  // Mock Fetcher for deterministic HTTP tests
  class MockScholarshipFetcher extends ScholarshipFetcherService {
    async fetchSafeContent(targetUrl: string): Promise<FetchedWebContent> {
      // Still enforce SSRF validation
      await validateUrlForSSRF(targetUrl, async (host) => {
        if (host === 'evil-internal.com') return ['169.254.169.254'];
        if (host === 'localhost-alias.org') return ['127.0.0.1'];
        return ['93.184.216.34']; // public ip
      });

      return {
        html: `<!DOCTYPE html><html><head><title>Oxford Clarendon Scholarship 2026</title><meta name="description" content="Fully funded graduate scholarship for outstanding international students at the University of Oxford."></head><body><h1>Clarendon Fund</h1><p>Full tuition and living stipend included.</p></body></html>`,
        cleanText:
          'Oxford Clarendon Scholarship 2026 Clarendon Fund Full tuition and living stipend included.',
        title: 'Oxford Clarendon Scholarship 2026',
        metaDescription:
          'Fully funded graduate scholarship for outstanding international students at the University of Oxford.',
        finalUrl: targetUrl,
        statusCode: 200,
        contentLengthBytes: 345,
      };
    }
  }

  let testUserToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    app.prisma = mockPrisma;
    (app as any).scholarshipFetcherService = new MockScholarshipFetcher();

    // Create a student user for authenticated tests
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'scholarship.hunter@cambridge.ac.uk',
        password: 'Password123!',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });

    const userBody = JSON.parse(userRes.body);
    testUserId = userBody.data.user.id;
    testUserToken = userBody.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('SSRF Protection Validator (ssrf-validator.ts)', () => {
    describe('isPrivateOrReservedIPv4', () => {
      it('blocks loopback IP addresses (127.0.0.0/8)', () => {
        expect(isPrivateOrReservedIPv4('127.0.0.1')).toBe(true);
        expect(isPrivateOrReservedIPv4('127.0.0.2')).toBe(true);
        expect(isPrivateOrReservedIPv4('127.255.255.255')).toBe(true);
      });

      it('blocks Cloud Provider Instance Metadata IP (169.254.169.254)', () => {
        // AWS, GCP, Azure, DigitalOcean metadata service
        expect(isPrivateOrReservedIPv4('169.254.169.254')).toBe(true);
        expect(isPrivateOrReservedIPv4('169.254.1.1')).toBe(true);
      });

      it('blocks RFC 1918 Private IPv4 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', () => {
        expect(isPrivateOrReservedIPv4('10.0.0.1')).toBe(true);
        expect(isPrivateOrReservedIPv4('10.254.254.1')).toBe(true);
        expect(isPrivateOrReservedIPv4('172.16.0.1')).toBe(true);
        expect(isPrivateOrReservedIPv4('172.31.255.254')).toBe(true);
        expect(isPrivateOrReservedIPv4('192.168.1.1')).toBe(true);
        expect(isPrivateOrReservedIPv4('192.168.0.254')).toBe(true);
      });

      it('blocks broadcast, 0.0.0.0, and CGNAT ranges', () => {
        expect(isPrivateOrReservedIPv4('0.0.0.0')).toBe(true);
        expect(isPrivateOrReservedIPv4('100.64.0.1')).toBe(true);
        expect(isPrivateOrReservedIPv4('224.0.0.1')).toBe(true);
        expect(isPrivateOrReservedIPv4('255.255.255.255')).toBe(true);
      });

      it('allows legitimate public IPv4 addresses', () => {
        expect(isPrivateOrReservedIPv4('93.184.216.34')).toBe(false); // example.com
        expect(isPrivateOrReservedIPv4('8.8.8.8')).toBe(false); // Google DNS
        expect(isPrivateOrReservedIPv4('1.1.1.1')).toBe(false); // Cloudflare DNS
        expect(isPrivateOrReservedIPv4('142.250.190.46')).toBe(false);
      });
    });

    describe('isPrivateOrReservedIPv6', () => {
      it('blocks IPv6 loopback and unspecified addresses', () => {
        expect(isPrivateOrReservedIPv6('::1')).toBe(true);
        expect(isPrivateOrReservedIPv6('::')).toBe(true);
      });

      it('blocks Unique Local Addresses (fc00::/7)', () => {
        expect(isPrivateOrReservedIPv6('fc00::1')).toBe(true);
        expect(isPrivateOrReservedIPv6('fd12:3456:789a::1')).toBe(true);
      });

      it('blocks Link-Local IPv6 (fe80::/10)', () => {
        expect(isPrivateOrReservedIPv6('fe80::1')).toBe(true);
      });

      it('blocks IPv4-mapped IPv6 loopback and metadata addresses', () => {
        expect(isPrivateOrReservedIPv6('::ffff:127.0.0.1')).toBe(true);
        expect(isPrivateOrReservedIPv6('::ffff:169.254.169.254')).toBe(true);
        expect(isPrivateOrReservedIPv6('::ffff:192.168.1.1')).toBe(true);
      });

      it('allows public IPv6 addresses', () => {
        expect(isPrivateOrReservedIPv6('2606:4700:4700::1111')).toBe(false);
      });
    });

    describe('validateUrlForSSRF', () => {
      it('rejects disallowed schemes (ftp, file, gopher, javascript, data)', async () => {
        await expect(validateUrlForSSRF('file:///etc/passwd')).rejects.toThrow(SSRFProtectionError);
        await expect(validateUrlForSSRF('ftp://ftp.example.com/file')).rejects.toThrow(
          SSRFProtectionError
        );
        await expect(validateUrlForSSRF('gopher://gopher.example.com')).rejects.toThrow(
          SSRFProtectionError
        );
        await expect(validateUrlForSSRF('javascript:alert(1)')).rejects.toThrow(
          SSRFProtectionError
        );
      });

      it('rejects internal and non-web ports', async () => {
        await expect(validateUrlForSSRF('http://example.com:22')).rejects.toThrow(
          /Port '22' is not permitted/
        );
        await expect(validateUrlForSSRF('http://example.com:5432')).rejects.toThrow(
          /Port '5432' is not permitted/
        );
        await expect(validateUrlForSSRF('http://example.com:6379')).rejects.toThrow(
          /Port '6379' is not permitted/
        );
        await expect(validateUrlForSSRF('http://example.com:9000')).rejects.toThrow(
          /Port '9000' is not permitted/
        );
      });

      it('rejects reserved local hostnames (localhost, *.local, *.internal)', async () => {
        await expect(validateUrlForSSRF('http://localhost')).rejects.toThrow(/reserved local/);
        await expect(validateUrlForSSRF('http://sub.localhost')).rejects.toThrow(/reserved local/);
        await expect(validateUrlForSSRF('http://api.internal')).rejects.toThrow(/reserved local/);
        await expect(validateUrlForSSRF('http://router.lan')).rejects.toThrow(/reserved local/);
      });

      it('rejects raw IP literals in private ranges', async () => {
        await expect(validateUrlForSSRF('http://127.0.0.1')).rejects.toThrow(
          /points to a private, loopback, or cloud metadata network/
        );
        await expect(validateUrlForSSRF('http://169.254.169.254/latest/meta-data')).rejects.toThrow(
          /points to a private, loopback, or cloud metadata network/
        );
        await expect(validateUrlForSSRF('http://[::1]')).rejects.toThrow(
          /points to a private, loopback, or cloud metadata network/
        );
      });

      it('rejects domains that resolve to private or cloud metadata IPs via DNS', async () => {
        const mockResolver = async (_host: string) => ['169.254.169.254'];
        await expect(validateUrlForSSRF('http://metadata-rebinding.com', mockResolver)).rejects.toThrow(
          /resolves to restricted IP '169.254.169.254'/
        );
      });

      it('allows valid public HTTPS scholarship URLs', async () => {
        const mockResolver = async (_host: string) => ['93.184.216.34'];
        const result = await validateUrlForSSRF(
          'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/clarendon-fund',
          mockResolver
        );

        expect(result.valid).toBe(true);
        expect(result.hostname).toBe('www.ox.ac.uk');
        expect(result.resolvedIps).toEqual(['93.184.216.34']);
      });
    });
  });

  describe('ScholarshipService & Ingestion Pipeline', () => {
    it('creates a Scholarship record with status PENDING and initial source', async () => {
      const fetcher = new MockScholarshipFetcher();
      const service = new ScholarshipService(mockPrisma, fetcher);

      const targetUrl = 'https://oxford.ac.uk/scholarships/clarendon-2026';
      const result = await service.analyzeUrl(testUserId, {
        url: targetUrl,
        title: 'Oxford Clarendon Fund 2026',
        providerName: 'University of Oxford',
      });

      expect(result.scholarship).toBeDefined();
      expect(result.scholarship.title).toBe('Oxford Clarendon Fund 2026');
      expect(result.scholarship.providerName).toBe('University of Oxford');
      expect(result.scholarship.verificationStatus).toBe('PENDING');
      expect(result.scholarship.verificationScore).toBe(0.0);
      expect(result.scholarship.sources).toHaveLength(1);
      expect(result.scholarship.sources[0].sourceDomain).toBe('oxford.ac.uk');
      expect(result.isExisting).toBe(false);
      expect(result.extractedPreview.title).toBe('Oxford Clarendon Scholarship 2026');
    });

    it('returns existing scholarship when re-analyzing the same URL without duplicate rows', async () => {
      const fetcher = new MockScholarshipFetcher();
      const service = new ScholarshipService(mockPrisma, fetcher);

      const targetUrl = 'https://oxford.ac.uk/scholarships/clarendon-2026';
      const secondResult = await service.analyzeUrl(testUserId, {
        url: targetUrl,
      });

      expect(secondResult.isExisting).toBe(true);
      expect(secondResult.scholarship.websiteUrl).toBe(targetUrl);
    });

    it('getScholarshipById retrieves scholarship with its sources', async () => {
      const fetcher = new MockScholarshipFetcher();
      const service = new ScholarshipService(mockPrisma, fetcher);

      const ingested = await service.analyzeUrl(testUserId, {
        url: 'https://daad.de/en/find-funding/scholarship-database',
      });

      const retrieved = await service.getScholarshipById(ingested.scholarship.id);
      expect(retrieved.id).toBe(ingested.scholarship.id);
      expect(retrieved.verificationStatus).toBe('PENDING');
      expect(retrieved.sources).toBeDefined();
    });

    it('listScholarships supports pagination and status filters', async () => {
      const fetcher = new MockScholarshipFetcher();
      const service = new ScholarshipService(mockPrisma, fetcher);

      const list = await service.listScholarships({ status: 'PENDING', page: 1, limit: 10 });
      expect(list.items.length).toBeGreaterThanOrEqual(1);
      expect(list.pagination.total).toBeGreaterThanOrEqual(1);
      expect(list.items[0].verificationStatus).toBe('PENDING');
    });
  });

  describe('HTTP Endpoints (/api/v1/scholarships)', () => {
    it('POST /api/v1/scholarships/analyze returns 401 without JWT', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/scholarships/analyze',
        payload: {
          url: 'https://oxford.ac.uk/scholarships/test',
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/scholarships/analyze blocks SSRF attacks (169.254.169.254) with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/scholarships/analyze',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
        payload: {
          url: 'http://169.254.169.254/latest/meta-data',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SSRF_VIOLATION');
      expect(body.error.message).toContain('private, loopback, or cloud metadata network');
    });

    it('POST /api/v1/scholarships/analyze blocks localhost attempts with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/scholarships/analyze',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
        payload: {
          url: 'http://localhost:3001/api/v1/health',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('SSRF_VIOLATION');
    });

    it('POST /api/v1/scholarships/analyze successfully ingests valid scholarship URL with 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/scholarships/analyze',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
        payload: {
          url: 'https://harvard.edu/financial-aid/scholarships/presidential',
          title: 'Harvard Presidential Scholarship',
          providerName: 'Harvard University',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.scholarship.title).toBe('Harvard Presidential Scholarship');
      expect(body.data.scholarship.providerName).toBe('Harvard University');
      expect(body.data.scholarship.verificationStatus).toBe('PENDING');
      expect(body.data.extractedPreview).toBeDefined();
      expect(body.data.extractedPreview.title).toBe('Oxford Clarendon Scholarship 2026');
    });

    it('GET /api/v1/scholarships/:id returns 200 with scholarship details', async () => {
      // First ingest
      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/scholarships/analyze',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
        payload: {
          url: 'https://stanford.edu/knight-hennessy-scholars',
        },
      });

      const scholarshipId = JSON.parse(postRes.body).data.scholarship.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/scholarships/${scholarshipId}`,
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      });

      expect(getRes.statusCode).toBe(200);
      const body = JSON.parse(getRes.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(scholarshipId);
      expect(body.data.verificationStatus).toBe('PENDING');
      expect(Array.isArray(body.data.sources)).toBe(true);
    });

    it('GET /api/v1/scholarships returns 200 with list and pagination', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/scholarships?page=1&limit=5',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
    });
  });
});
