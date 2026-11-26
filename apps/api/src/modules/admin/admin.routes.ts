import { FastifyPluginAsync } from 'fastify';
import { AdminController } from './admin.controller.js';

export const adminRoutes: FastifyPluginAsync = async (server) => {
  const controller = new AdminController();

  // Strictly require ADMIN role on all admin endpoints
  server.addHook('preHandler', server.requireAdmin);

  server.get('/api/v1/admin/metrics', controller.getMetrics);
  server.get('/api/v1/admin/audit-logs', controller.getAuditLogs);
};
