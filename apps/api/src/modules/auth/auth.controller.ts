import { FastifyReply, FastifyRequest } from 'fastify';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '@scholaris/validation';
import { AuthService } from './auth.service.js';

export class AuthController {
  private getService(request: FastifyRequest): AuthService {
    return new AuthService(request.server.prisma, request.server.jwt);
  }

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = registerSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.register(input);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = loginSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.login(input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  refreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = refreshTokenSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.refreshToken(input.refreshToken);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const service = this.getService(request);
    const result = await service.getMe(userId);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };
}
