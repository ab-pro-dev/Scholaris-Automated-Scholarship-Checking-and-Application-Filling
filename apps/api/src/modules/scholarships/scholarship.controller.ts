import { FastifyReply, FastifyRequest } from 'fastify';
import { analyzeScholarshipSchema } from '@scholaris/validation';
import { ScholarshipService, ListScholarshipsQuery } from './scholarship.service.js';
import { ScholarshipFetcherService } from './scholarship-fetcher.service.js';
import { ScholarshipVerificationService } from './scholarship-verification.service.js';
import { AIAuditService } from '../ai/ai-audit.service.js';
import { AIService } from '@scholaris/ai';
import { env } from '../../config/env.js';
import { VerificationStatus } from '@scholaris/database';

export class ScholarshipController {
  private customService?: ScholarshipService;
  private customVerificationService?: ScholarshipVerificationService;

  constructor(
    service?: ScholarshipService,
    verificationService?: ScholarshipVerificationService
  ) {
    this.customService = service;
    this.customVerificationService = verificationService;
  }

  private getService(request: FastifyRequest): ScholarshipService {
    if (this.customService) {
      return this.customService;
    }
    const prisma = request.server.prisma;
    const fetcher =
      (request.server as any).scholarshipFetcherService ||
      new ScholarshipFetcherService();
    return new ScholarshipService(prisma, fetcher);
  }

  private getVerificationService(request: FastifyRequest): ScholarshipVerificationService {
    if (this.customVerificationService) {
      return this.customVerificationService;
    }
    const prisma = request.server.prisma;
    const aiAuditService =
      (request.server as any).aiAuditService ||
      new AIAuditService(
        prisma,
        new AIService({
          geminiApiKey: env.GEMINI_API_KEY,
          geminiModel: env.GEMINI_MODEL,
          openRouterApiKey: env.OPENROUTER_API_KEY,
          openRouterModel: env.OPENROUTER_MODEL,
        })
      );
    const fetcher =
      (request.server as any).scholarshipFetcherService ||
      new ScholarshipFetcherService();
    return new ScholarshipVerificationService(prisma, aiAuditService, fetcher);
  }

  /**
   * POST /api/v1/scholarships/analyze
   * Ingests a scholarship URL with SSRF protection and extracts initial metadata.
   */
  analyzeScholarship = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = analyzeScholarshipSchema.parse(request.body);
    const userId = request.user?.sub;
    const service = this.getService(request);

    const result = await service.analyzeUrl(userId, input);

    return reply.status(result.isExisting ? 200 : 201).send({
      success: true,
      data: result,
    });
  };

  /**
   * GET /api/v1/scholarships/:id
   * Retrieves a single scholarship with its sources and requirements.
   */
  getScholarship = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const service = this.getService(request);

    const scholarship = await service.getScholarshipById(id);

    return reply.send({
      success: true,
      data: scholarship,
    });
  };

  /**
   * POST /api/v1/scholarships/:id/verify
   * Runs AI authenticity verification and scam detection on an ingested scholarship.
   */
  verifyScholarship = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const userId = request.user?.sub;
    const service = this.getVerificationService(request);

    const result = await service.verifyScholarship(id, userId);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  /**
   * GET /api/v1/scholarships
   * Lists scholarships with optional status filtering and search.
   */
  listScholarships = async (
    request: FastifyRequest<{
      Querystring: {
        status?: VerificationStatus;
        search?: string;
        page?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const service = this.getService(request);
    const query: ListScholarshipsQuery = {
      status: request.query.status,
      search: request.query.search,
      page: request.query.page ? parseInt(request.query.page, 10) : 1,
      limit: request.query.limit ? parseInt(request.query.limit, 10) : 20,
    };

    const result = await service.listScholarships(query);

    return reply.send({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  };
}
