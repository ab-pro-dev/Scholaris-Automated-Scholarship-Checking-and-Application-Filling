import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { JWTPayload } from '@scholaris/types';
import { UnauthorizedError, ForbiddenError } from '@scholaris/shared';
import { env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (server) => {
  await server.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: '15m',
    },
  });

  server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
  });

  server.decorate('requireAdmin', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenError('Administrator privileges required');
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
