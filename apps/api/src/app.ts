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
import { scholarshipRoutes } from './modules/scholarships/scholarship.routes.js';
import { automationRoutes } from './modules/automation/automation.routes.js';
import { applicationRoutes } from './modules/applications/application.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

export async function buildApp(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.NODE_ENV === 'development' ? 'debug' : 'info' },
    ...opts,
  });

  // Security & Utility Plugins
  await app.register(sensible);
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  await app.register(cors, {
    origin: allowedOrigins.length <= 1 ? (allowedOrigins[0] ?? '*') : allowedOrigins,
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

    if (error instanceof ZodError || error.name === 'ZodError') {
      const zodErr = error as ZodError;
      const firstIssue = zodErr.issues?.[0]?.message;
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstIssue || 'Invalid input data',
          details:
            typeof zodErr.flatten === 'function'
              ? zodErr.flatten().fieldErrors
              : zodErr.issues,
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

    const prismaCode = (error as any)?.code;
    if (
      error.name === 'PrismaClientInitializationError' ||
      prismaCode === 'P1001' ||
      prismaCode === 'P1002' ||
      error.message?.includes("Can't reach database server")
    ) {
      app.log.error(error);
      return reply.status(503).send({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message:
            'Database service is currently unreachable. Ensure PostgreSQL is running ("docker compose up -d") and try again.',
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
  await app.register(scholarshipRoutes);
  await app.register(automationRoutes);
  await app.register(applicationRoutes);
  await app.register(adminRoutes);

  return app;
}
