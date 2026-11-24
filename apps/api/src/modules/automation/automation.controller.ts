import { FastifyReply, FastifyRequest } from 'fastify';
import { resumeSessionSchema } from '@scholaris/validation';
import { AutomationService } from './automation.service.js';

export class AutomationController {
  private customService?: AutomationService;

  constructor(service?: AutomationService) {
    this.customService = service;
  }

  private getService(request: FastifyRequest): AutomationService {
    if (this.customService) {
      return this.customService;
    }
    const prisma = request.server.prisma;
    return new AutomationService(prisma);
  }

  getSession = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);

    const session = await service.getSession(userId, id);
    return reply.status(200).send({
      success: true,
      data: session,
    });
  };

  resumeSession = async (
    request: FastifyRequest<{ Params: { id: string }; Body?: unknown }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);

    const input = request.body ? resumeSessionSchema.parse(request.body) : { userConfirmed: true };
    const result = await service.resumeSession(userId, id, input);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  abortSession = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);

    const result = await service.abortSession(userId, id);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  getNotifications = async (
    request: FastifyRequest<{ Querystring: { unreadOnly?: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const unreadOnly = request.query.unreadOnly === 'true';
    const service = this.getService(request);

    const notifications = await service.getNotifications(userId, { unreadOnly });
    return reply.status(200).send({
      success: true,
      data: notifications,
    });
  };

  markNotificationRead = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);

    const notification = await service.markNotificationRead(userId, id);
    return reply.status(200).send({
      success: true,
      data: notification,
    });
  };
}
