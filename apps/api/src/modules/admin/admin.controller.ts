import { FastifyReply, FastifyRequest } from 'fastify';
import { AdminService } from './admin.service.js';

export class AdminController {
  private getService(request: FastifyRequest): AdminService {
    return new AdminService(request.server.prisma);
  }

  getMetrics = async (request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await this.getService(request).getSystemMetrics();
    return reply.send({
      success: true,
      data: metrics,
    });
  };

  getAuditLogs = async (
    request: FastifyRequest<{
      Querystring: {
        userId?: string;
        action?: string;
        entityType?: string;
        page?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { userId, action, entityType, page, limit } = request.query;
    const result = await this.getService(request).getAuditLogs({
      userId,
      action,
      entityType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return reply.send({
      success: true,
      data: result.logs,
      meta: result.meta,
    });
  };
}
