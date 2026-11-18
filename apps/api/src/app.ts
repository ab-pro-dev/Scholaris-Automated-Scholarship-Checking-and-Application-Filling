import Fastify, { FastifyError, FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';

import { AppError } from '@scholaris/shared';
import { env } from './config/env.js';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { profileRoutes } from './modules/profiles/profile.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';

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

  // Database & Auth Plugins
  await app.register(prismaPlugin);
  await app.register(authPlugin);

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

    if (error.name === 'AIRateLimitError') {
      const rateLimitErr = error as any;
      if (rateLimitErr.retryAfterSeconds) {
        reply.header('Retry-After', rateLimitErr.retryAfterSeconds);
      }
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message,
          retryAfterSeconds: rateLimitErr.retryAfterSeconds,
        },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.flatten().fieldErrors,
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
  await app.register(authRoutes);
  await app.register(profileRoutes);
  await app.register(documentRoutes);
  await app.register(aiRoutes);

  return app;
}
