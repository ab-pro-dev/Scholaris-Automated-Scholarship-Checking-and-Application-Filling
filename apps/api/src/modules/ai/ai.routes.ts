import { FastifyPluginAsync } from 'fastify';
import { AIController } from './ai.controller.js';

export const aiRoutes: FastifyPluginAsync = async (server) => {
  const controller = new AIController();

  // All AI usage and audit endpoints require authentication
  server.addHook('preHandler', server.authenticate);

  server.get('/api/v1/ai/usage', controller.getUserUsage);
  server.get('/api/v1/ai/audit', controller.getAuditLogs);
};
