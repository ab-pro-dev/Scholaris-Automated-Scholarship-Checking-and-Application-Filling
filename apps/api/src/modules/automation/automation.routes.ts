import { FastifyPluginAsync } from 'fastify';
import { AutomationController } from './automation.controller.js';

export const automationRoutes: FastifyPluginAsync = async (server) => {
  const controller = new AutomationController();

  // All automation and session management routes require authenticated user
  server.addHook('preHandler', server.authenticate);

  // Browser Session Handoff & Controls
  server.get('/api/v1/automation/sessions/:id', controller.getSession);
  server.post('/api/v1/automation/sessions/:id/resume', controller.resumeSession);
  server.post('/api/v1/automation/sessions/:id/abort', controller.abortSession);

  // User Notifications
  server.get('/api/v1/automation/notifications', controller.getNotifications);
  server.patch('/api/v1/automation/notifications/:id/read', controller.markNotificationRead);
};
