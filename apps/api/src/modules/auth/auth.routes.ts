import { FastifyPluginAsync } from 'fastify';
import { AuthController } from './auth.controller.js';

export const authRoutes: FastifyPluginAsync = async (server) => {
  const controller = new AuthController();

  // Authentication Endpoints
  server.post('/api/v1/auth/register', controller.register);
  server.post('/api/v1/auth/login', controller.login);
  server.post('/api/v1/auth/refresh', controller.refreshToken);

  // Protected Account Route
  server.get(
    '/api/v1/auth/me',
    { preHandler: [server.authenticate] },
    controller.getMe
  );
};
