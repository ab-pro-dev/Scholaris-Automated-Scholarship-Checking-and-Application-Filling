import { FastifyPluginAsync } from 'fastify';
import { DocumentController } from './document.controller.js';

export const documentRoutes: FastifyPluginAsync = async (server) => {
  const controller = new DocumentController();

  // All document routes require authentication
  server.addHook('preHandler', server.authenticate);

  server.post('/api/v1/documents/presigned-upload', controller.getPresignedUpload);
  server.post('/api/v1/documents/confirm-upload', controller.confirmUpload);
  server.get('/api/v1/documents', controller.listDocuments);
  server.get('/api/v1/documents/:id/download', controller.getDownloadUrl);
  server.delete('/api/v1/documents/:id', controller.deleteDocument);
};
