import { FastifyReply, FastifyRequest } from 'fastify';
import {
  updateProfileSchema,
  educationRecordSchema,
  languageSkillSchema,
  achievementSchema,
  experienceSchema,
} from '@scholaris/validation';
import { ProfileService } from './profile.service.js';

interface IdParam {
  id: string;
}

export class ProfileController {
  private getService(request: FastifyRequest): ProfileService {
    return new ProfileService(request.server.prisma);
  }

  // ==========================================
  // Basic Profile Handlers
  // ==========================================

  getFullProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const service = this.getService(request);
    const result = await service.getFullProfile(userId);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const input = updateProfileSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.updateProfile(userId, input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  // ==========================================
  // Education Record Handlers
  // ==========================================

  listEducation = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const service = this.getService(request);
    const result = await service.listEducation(userId);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  createEducation = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const input = educationRecordSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.createEducation(userId, input);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  };

  updateEducation = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const input = educationRecordSchema.partial().parse(request.body);
    const service = this.getService(request);
    const result = await service.updateEducation(userId, id, input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  deleteEducation = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);
    await service.deleteEducation(userId, id);
    return reply.status(200).send({
      success: true,
      data: { message: 'Education record successfully deleted' },
    });
  };

  // ==========================================
  // Language Skill Handlers
  // ==========================================

  listLanguages = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const service = this.getService(request);
    const result = await service.listLanguages(userId);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  createLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const input = languageSkillSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.createLanguage(userId, input);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  };

  updateLanguage = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const input = languageSkillSchema.partial().parse(request.body);
    const service = this.getService(request);
    const result = await service.updateLanguage(userId, id, input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  deleteLanguage = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);
    await service.deleteLanguage(userId, id);
    return reply.status(200).send({
      success: true,
      data: { message: 'Language skill successfully deleted' },
    });
  };

  // ==========================================
  // Achievement Handlers
  // ==========================================

  listAchievements = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const service = this.getService(request);
    const result = await service.listAchievements(userId);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  createAchievement = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const input = achievementSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.createAchievement(userId, input);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  };

  updateAchievement = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const input = achievementSchema.partial().parse(request.body);
    const service = this.getService(request);
    const result = await service.updateAchievement(userId, id, input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  deleteAchievement = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);
    await service.deleteAchievement(userId, id);
    return reply.status(200).send({
      success: true,
      data: { message: 'Achievement successfully deleted' },
    });
  };

  // ==========================================
  // Experience Handlers
  // ==========================================

  listExperiences = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const service = this.getService(request);
    const result = await service.listExperiences(userId);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  createExperience = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const input = experienceSchema.parse(request.body);
    const service = this.getService(request);
    const result = await service.createExperience(userId, input);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  };

  updateExperience = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const input = experienceSchema.partial().parse(request.body);
    const service = this.getService(request);
    const result = await service.updateExperience(userId, id, input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  deleteExperience = async (
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const service = this.getService(request);
    await service.deleteExperience(userId, id);
    return reply.status(200).send({
      success: true,
      data: { message: 'Experience record successfully deleted' },
    });
  };
}
