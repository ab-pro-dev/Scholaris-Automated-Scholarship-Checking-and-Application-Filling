import { FastifyPluginAsync } from 'fastify';
import { ProfileController } from './profile.controller.js';

export const profileRoutes: FastifyPluginAsync = async (server) => {
  const controller = new ProfileController();

  // All profile routes require authentication
  server.addHook('preHandler', server.authenticate);

  // ==========================================
  // Basic Profile Routes
  // ==========================================
  server.get('/api/v1/profile', controller.getFullProfile);
  server.patch('/api/v1/profile', controller.updateProfile);

  // ==========================================
  // Education Record Routes
  // ==========================================
  server.get('/api/v1/profile/education', controller.listEducation);
  server.post('/api/v1/profile/education', controller.createEducation);
  server.patch('/api/v1/profile/education/:id', controller.updateEducation);
  server.delete('/api/v1/profile/education/:id', controller.deleteEducation);

  // ==========================================
  // Language Skill Routes
  // ==========================================
  server.get('/api/v1/profile/languages', controller.listLanguages);
  server.post('/api/v1/profile/languages', controller.createLanguage);
  server.patch('/api/v1/profile/languages/:id', controller.updateLanguage);
  server.delete('/api/v1/profile/languages/:id', controller.deleteLanguage);

  // ==========================================
  // Achievement Routes
  // ==========================================
  server.get('/api/v1/profile/achievements', controller.listAchievements);
  server.post('/api/v1/profile/achievements', controller.createAchievement);
  server.patch('/api/v1/profile/achievements/:id', controller.updateAchievement);
  server.delete('/api/v1/profile/achievements/:id', controller.deleteAchievement);

  // ==========================================
  // Experience Routes
  // ==========================================
  server.get('/api/v1/profile/experiences', controller.listExperiences);
  server.post('/api/v1/profile/experiences', controller.createExperience);
  server.patch('/api/v1/profile/experiences/:id', controller.updateExperience);
  server.delete('/api/v1/profile/experiences/:id', controller.deleteExperience);
};
