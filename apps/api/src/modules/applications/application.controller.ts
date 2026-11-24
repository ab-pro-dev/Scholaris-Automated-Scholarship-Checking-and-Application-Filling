import { FastifyReply, FastifyRequest } from 'fastify';
import {
  createApplicationSchema,
  updateFieldMappingSchema,
  resolveMissingInfoSchema,
} from '@scholaris/validation';
import { ApplicationService } from './application.service.js';
import { FieldMatcherService } from './field-matcher.service.js';
import { AIAuditService } from '../ai/ai-audit.service.js';
import { AIService } from '@scholaris/ai';
import { env } from '../../config/env.js';

export class ApplicationController {
  private customAppService?: ApplicationService;
  private customMatcherService?: FieldMatcherService;

  constructor(
    appService?: ApplicationService,
    matcherService?: FieldMatcherService
  ) {
    this.customAppService = appService;
    this.customMatcherService = matcherService;
  }

  private getAppService(request: FastifyRequest): ApplicationService {
    if (this.customAppService) return this.customAppService;
    return new ApplicationService(request.server.prisma);
  }

  private getMatcherService(request: FastifyRequest): FieldMatcherService {
    if (this.customMatcherService) return this.customMatcherService;
    const prisma = request.server.prisma;
    const aiAuditService =
      (request.server as any).aiAuditService ||
      new AIAuditService(
        prisma,
        new AIService({
          geminiApiKey: env.GEMINI_API_KEY,
          openRouterApiKey: env.OPENROUTER_API_KEY,
        })
      );
    return new FieldMatcherService(prisma, aiAuditService);
  }

  createApplication = async (
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const input = createApplicationSchema.parse(request.body);
    const service = this.getAppService(request);

    const application = await service.createApplication(userId, input);
    return reply.status(201).send({
      success: true,
      data: application,
    });
  };

  getApplication = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getAppService(request);

    const application = await service.getApplication(userId, id);
    return reply.status(200).send({
      success: true,
      data: application,
    });
  };

  listApplications = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const service = this.getAppService(request);

    const applications = await service.listApplications(userId);
    return reply.status(200).send({
      success: true,
      data: applications,
    });
  };

  matchFields = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const matcher = this.getMatcherService(request);

    const summary = await matcher.matchApplicationFields(id, userId);
    return reply.status(200).send({
      success: true,
      data: summary,
    });
  };

  getFieldMappings = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getAppService(request);

    const mappings = await service.getFieldMappings(userId, id);
    return reply.status(200).send({
      success: true,
      data: mappings,
    });
  };

  updateFieldMapping = async (
    request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const input = updateFieldMappingSchema.parse(request.body);
    const service = this.getAppService(request);

    const updated = await service.updateFieldMapping(userId, id, input);
    return reply.status(200).send({
      success: true,
      data: updated,
    });
  };

  resolveMissingInfo = async (
    request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const input = resolveMissingInfoSchema.parse(request.body);
    const service = this.getAppService(request);

    const result = await service.resolveMissingInfo(userId, id, input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };
}
