import { FastifyPluginAsync } from 'fastify';
import { ScholarshipController } from './scholarship.controller.js';

export const scholarshipRoutes: FastifyPluginAsync = async (server) => {
  const controller = new ScholarshipController();

  // All scholarship analysis and lookup routes require authentication
  server.addHook('preHandler', server.authenticate);

  server.post('/api/v1/scholarships/analyze', controller.analyzeScholarship);
  server.post('/api/v1/scholarships/:id/verify', controller.verifyScholarship);
  server.get('/api/v1/scholarships/:id', controller.getScholarship);
  server.get('/api/v1/scholarships', controller.listScholarships);
};
