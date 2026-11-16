import Fastify, { FastifyError, FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';

import { AppError } from '@scholaris/shared';
import { env } from './config/env.js';
import prismaPlugin from './plugins/prisma.js';
import { healthRoutes } from './modules/health/health.routes.js';

export async function buildApp(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.NODE_ENV === 'development' ? 'debug' : 'info' },
    ...opts,
  });

  // Security & Utility Plugins
  await app.register(sensible);
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Database Plugin
  await app.register(prismaPlugin);

  // Global Error Handler
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    const fastifyErr = error as FastifyError;
    if (fastifyErr.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fastifyErr.message,
          details: fastifyErr.validation,
        },
      });
    }

    app.log.error(error);
    return reply.status(fastifyErr.statusCode || 500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      },
    });
  });

  // Register Routes
  await app.register(healthRoutes);

  return app;
}
