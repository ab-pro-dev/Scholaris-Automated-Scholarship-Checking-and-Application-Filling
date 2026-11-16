import { FastifyPluginAsync } from 'fastify';
import { APP_NAME } from '@scholaris/shared';

export const healthRoutes: FastifyPluginAsync = async (server) => {
  const handler = async () => {
    let databaseStatus = 'disconnected';
    try {
      // Quick ping query with 1.5s timeout
      await server.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'unreachable';
    }

    return {
      status: 'ok',
      appName: APP_NAME,
      version: '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: databaseStatus,
    };
  };

  server.get('/health', handler);
  server.get('/api/v1/health', handler);
};
