import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { prisma, PrismaClient } from '@scholaris/database';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (server) => {
  server.decorate('prisma', prisma);

  server.addHook('onClose', async () => {
    await server.prisma.$disconnect();
  });
};

export default fp(prismaPlugin, { name: 'prisma' });
