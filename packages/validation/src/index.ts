import { z } from 'zod';

// ==========================================
// Authentication Schemas
// ==========================================

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ==========================================
// Student Profile Schemas
// ==========================================

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  middleName: z.string().max(100).trim().nullable().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).nullable().optional(),
  nationality: z.string().min(2).max(100).trim().optional(),
  residenceCountry: z.string().min(2).max(100).trim().optional(),
  city: z.string().min(1).max(100).trim().optional(),
  address: z.string().max(255).trim().nullable().optional(),
  phone: z.string().max(30).trim().nullable().optional(),
  altEmail: z.string().email().nullable().optional(),
  familyIncomeTier: z.string().max(50).nullable().optional(),
  financialStatement: z.string().max(2000).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const educationRecordSchema = z.object({
  level: z.enum(['HIGH_SCHOOL', 'UNDERGRADUATE', 'POSTGRADUATE', 'DOCTORAL']),
  institution: z.string().min(2, 'Institution name is required').max(255).trim(),
  faculty: z.string().max(255).trim().nullable().optional(),
  degree: z.string().max(255).trim().nullable().optional(),
  fieldOfStudy: z.string().min(2, 'Field of study is required').max(255).trim(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').nullable().optional(),
  isCurrent: z.boolean().default(false),
  gpa: z.number().min(0).max(10).nullable().optional(),
  maxGpa: z.number().min(1).max(10).nullable().optional(),
  honors: z.string().max(255).nullable().optional(),
});

export type EducationRecordInput = z.infer<typeof educationRecordSchema>;

export const languageSkillSchema = z.object({
  language: z.string().min(2, 'Language name is required').max(100).trim(),
  isNative: z.boolean().default(false),
  proficiencyLevel: z.string().max(50).nullable().optional(),
  testType: z.enum(['IELTS', 'TOEFL', 'DUOLINGO', 'NONE', 'OTHER']).nullable().optional(),
  testScore: z.string().max(50).nullable().optional(),
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type LanguageSkillInput = z.infer<typeof languageSkillSchema>;

export const achievementSchema = z.object({
  title: z.string().min(2, 'Title is required').max(255).trim(),
  issuer: z.string().max(255).trim().nullable().optional(),
  dateReceived: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  description: z.string().max(1000).trim().nullable().optional(),
});

export type AchievementInput = z.infer<typeof achievementSchema>;

export const experienceSchema = z.object({
  type: z.enum(['WORK', 'VOLUNTEER', 'RESEARCH', 'LEADERSHIP']),
  organization: z.string().min(2, 'Organization name is required').max(255).trim(),
  roleTitle: z.string().min(2, 'Role title is required').max(255).trim(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(2000).trim().nullable().optional(),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;

// ==========================================
// Document Management Schemas
// ==========================================

export const presignedUploadRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
  category: z.enum([
    'TRANSCRIPT',
    'CV',
    'PASSPORT',
    'RECOMMENDATION',
    'MOTIVATION_LETTER',
    'CERTIFICATE',
    'OTHER',
  ]),
});

export type PresignedUploadRequestInput = z.infer<typeof presignedUploadRequestSchema>;

export const confirmUploadSchema = z.object({
  fileKey: z.string().min(1, 'File key is required'),
  name: z.string().min(1, 'Document name is required').max(255),
  category: z.enum([
    'TRANSCRIPT',
    'CV',
    'PASSPORT',
    'RECOMMENDATION',
    'MOTIVATION_LETTER',
    'CERTIFICATE',
    'OTHER',
  ]),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  checksum: z.string().max(64).optional().default(''),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

// ==========================================
// Scholarship & Verification Schemas
// ==========================================

export const analyzeScholarshipSchema = z.object({
  url: z.string().url('Must be a valid HTTP or HTTPS URL').trim(),
});

export type AnalyzeScholarshipInput = z.infer<typeof analyzeScholarshipSchema>;

// ==========================================
// Application & Approval Schemas
// ==========================================

export const createApplicationSchema = z.object({
  scholarshipId: z.string().uuid('Valid scholarship ID required'),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateFieldMappingSchema = z.object({
  fieldId: z.string().uuid(),
  mappedValue: z.string(),
});

export type UpdateFieldMappingInput = z.infer<typeof updateFieldMappingSchema>;

export const resolveMissingInfoSchema = z.object({
  missingInfoId: z.string().uuid(),
  userResponse: z.string().min(1, 'Response is required'),
});

export type ResolveMissingInfoInput = z.infer<typeof resolveMissingInfoSchema>;

export const draftEssaySchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters').max(2000),
  wordLimit: z.number().int().min(50).max(1500).optional(),
});

export type DraftEssayInput = z.infer<typeof draftEssaySchema>;

export const approveApplicationSchema = z.object({
  consentConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must explicitly consent before submission' }),
  }),
});

export type ApproveApplicationInput = z.infer<typeof approveApplicationSchema>;
