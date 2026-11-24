import { FastifyPluginAsync } from 'fastify';
import { ApplicationController } from './application.controller.js';

export const applicationRoutes: FastifyPluginAsync = async (server) => {
  const controller = new ApplicationController();

  // All application operations require an authenticated student user
  server.addHook('preHandler', server.authenticate);

  server.post('/api/v1/applications', controller.createApplication);
  server.get('/api/v1/applications', controller.listApplications);
  server.get('/api/v1/applications/:id', controller.getApplication);

  // Field Matching & Missing Info
  server.post('/api/v1/applications/:id/match-fields', controller.matchFields);
  server.get('/api/v1/applications/:id/field-mappings', controller.getFieldMappings);
  server.patch('/api/v1/applications/:id/field-mappings', controller.updateFieldMapping);
  server.post('/api/v1/applications/:id/missing-info/resolve', controller.resolveMissingInfo);

  // Missing Information & Essay Drafting (TASK-025)
  server.get('/api/v1/applications/:id/missing-info', controller.getMissingInfo);
  server.put('/api/v1/applications/:id/missing-info/:infoId', controller.updateMissingInfo);
  server.put('/api/v1/applications/:id/missing-info', controller.updateMissingInfo);
  server.post('/api/v1/applications/:id/draft-essay', controller.draftEssay);

  // Pre-Submission Application Review (TASK-027)
  server.get('/api/v1/applications/:id/review', controller.getApplicationReview);

  // Submission Authorization & Execution (TASK-028)
  server.post('/api/v1/applications/:id/approve', controller.approveApplication);
  server.post('/api/v1/applications/:id/submit', controller.submitApplication);
  server.get('/api/v1/applications/:id/submission-status', controller.getSubmissionStatus);
};
