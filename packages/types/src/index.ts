/**
 * Scholaris Shared Core Types & Enums
 */

// ==========================================
// User & Authentication Types
// ==========================================

export type UserRole = 'STUDENT' | 'ADMIN';

export interface UserDTO {
  id: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ==========================================
// Student Profile Types
// ==========================================

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface UserProfileDTO {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  nationality: string;
  residenceCountry: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  altEmail?: string | null;
  passportNumberEncrypted?: string | null;
  familyIncomeTier?: string | null;
  financialStatement?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EducationLevel =
  | 'HIGH_SCHOOL'
  | 'UNDERGRADUATE'
  | 'POSTGRADUATE'
  | 'DOCTORAL';

export interface EducationRecordDTO {
  id: string;
  userId: string;
  level: EducationLevel;
  institution: string;
  faculty?: string | null;
  degree?: string | null;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  gpa?: number | null;
  maxGpa?: number | null;
  honors?: string | null;
}

export type LanguageTestType = 'IELTS' | 'TOEFL' | 'DUOLINGO' | 'NONE' | 'OTHER';

export interface LanguageSkillDTO {
  id: string;
  userId: string;
  language: string;
  isNative: boolean;
  proficiencyLevel?: string | null;
  testType?: LanguageTestType | null;
  testScore?: string | null;
  testDate?: string | null;
}

export interface AchievementDTO {
  id: string;
  userId: string;
  title: string;
  issuer?: string | null;
  dateReceived?: string | null;
  description?: string | null;
}

export type ExperienceType = 'WORK' | 'VOLUNTEER' | 'RESEARCH' | 'LEADERSHIP';

export interface ExperienceDTO {
  id: string;
  userId: string;
  type: ExperienceType;
  organization: string;
  roleTitle: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

// ==========================================
// Document Management Types
// ==========================================

export type DocumentCategory =
  | 'TRANSCRIPT'
  | 'CV'
  | 'PASSPORT'
  | 'RECOMMENDATION'
  | 'MOTIVATION_LETTER'
  | 'CERTIFICATE'
  | 'OTHER';

export type OCRStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DocumentDTO {
  id: string;
  userId: string;
  name: string;
  category: DocumentCategory;
  fileKey: string;
  mimeType: string;
  sizeBytes: number;
  extractedText?: string | null;
  ocrStatus: OCRStatus;
  checksum: string;
  createdAt: string;
}

// ==========================================
// Scholarship & Verification Types
// ==========================================

export type FundingType = 'FULL' | 'PARTIAL' | 'TUITION_ONLY' | 'STIPEND_ONLY' | 'OTHER';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'UNCERTAIN' | 'SUSPICIOUS';

export interface ScholarshipDTO {
  id: string;
  title: string;
  providerName: string;
  websiteUrl: string;
  applicationUrl?: string | null;
  deadline?: string | null;
  fundingType: FundingType;
  verificationStatus: VerificationStatus;
  verificationScore: number;
  verificationSummary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScholarshipSourceDTO {
  id: string;
  scholarshipId: string;
  sourceUrl: string;
  sourceDomain: string;
  institutionMatch: boolean;
  scamFlagsDetected: string[];
  evidenceNotes?: string | null;
}

export type RequirementCategory =
  | 'NATIONALITY'
  | 'AGE'
  | 'GPA'
  | 'DEGREE_LEVEL'
  | 'LANGUAGE'
  | 'FIELD'
  | 'FINANCIAL'
  | 'OTHER';

export type RequirementOperator = 'EQ' | 'GTE' | 'LTE' | 'IN';

export interface EligibilityRequirementDTO {
  id: string;
  scholarshipId: string;
  category: RequirementCategory;
  operator: RequirementOperator;
  requiredValue: string;
  isMandatory: boolean;
  description?: string | null;
}

export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'INSUFFICIENT_INFO';

export interface EligibilityCriterionResult {
  requirementId: string;
  category: RequirementCategory;
  operator?: RequirementOperator;
  requiredValue?: string;
  isMandatory?: boolean;
  isMet: boolean | null;
  studentValue?: string | null;
  explanation: string;
  missingData?: string | null;
}

export interface EligibilityEvaluationSummary {
  totalCriteria: number;
  satisfiedCount: number;
  failedCount: number;
  unconfirmedCount: number;
  mandatorySatisfied: number;
  mandatoryTotal: number;
  missingProfileFields: string[];
  summary: string;
}

export interface EligibilityResultDTO {
  id: string;
  userId: string;
  scholarshipId: string;
  status: EligibilityStatus;
  score: number;
  criteriaBreakdown: EligibilityCriterionResult[];
  summary?: EligibilityEvaluationSummary;
  evaluatedAt: string;
}

// ==========================================
// Application & Automation Types
// ==========================================

export type ApplicationStatus =
  | 'DRAFT'
  | 'PREPARING'
  | 'WAITING_FOR_INPUT'
  | 'READY_FOR_REVIEW'
  | 'AWAITING_APPROVAL'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'SUBMISSION_FAILED'
  | 'REQUIRES_MANUAL_ACTION';

export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'FILE'
  | 'DATE';

export type MappingSourceType =
  | 'PROFILE'
  | 'DOCUMENT'
  | 'USER_INPUT'
  | 'AI_DRAFT';

export interface ApplicationFieldDTO {
  id: string;
  applicationId: string;
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  options?: string[] | null;
  isRequired: boolean;
  pageNumber: number;
}

export interface FieldMappingDTO {
  id: string;
  applicationId: string;
  fieldId: string;
  mappedValue: string;
  sourceType: MappingSourceType;
  sourcePath?: string | null;
  confidence: number;
  isEditedByUser: boolean;
}

export type MissingInfoCategory = 'FIELD_VALUE' | 'DOCUMENT_UPLOAD' | 'ESSAY_RESPONSE';

export interface MissingInformationDTO {
  id: string;
  applicationId: string;
  fieldId?: string | null;
  prompt: string;
  category: MissingInfoCategory;
  isResolved: boolean;
  userResponse?: string | null;
}

export interface MissingInfoDetailDTO extends MissingInformationDTO {
  field?: ApplicationFieldDTO | null;
  availableDocuments?: {
    id: string;
    name: string;
    category: string;
  }[];
}

export interface EssayDraftResult {
  applicationId: string;
  fieldId?: string | null;
  essayDraft: string;
  wordCount: number;
  wordLimit?: number | null;
  sourceType: 'AI_DRAFT';
  requiresUserReview: true;
  keyHighlightsUsed: string[];
  suggestedEdits: string[];
  aiMetrics?: {
    model: string;
    tokensUsed: number;
    latencyMs: number;
    costUSD?: number;
  };
}

export interface ApplicationDTO {
  id: string;
  userId: string;
  scholarshipId: string;
  status: ApplicationStatus;
  userApprovedAt?: string | null;
  submittedAt?: string | null;
  submissionProofUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDashboardItemDTO extends ApplicationDTO {
  scholarship: {
    id: string;
    title: string;
    providerName: string;
    deadline: string | null;
    verificationStatus: VerificationStatus;
    fundingType?: FundingType;
  };
  _count: {
    fields: number;
    fieldMappings: number;
    missingInformation: number;
  };
  unresolvedMissingCount: number;
  completionPercentage: number;
}

export interface SubmissionStatusDTO {
  applicationId: string;
  status: ApplicationStatus;
  userApprovedAt: string | null;
  submittedAt: string | null;
  submissionProofUrl: string | null;
  confirmationCode?: string | null;
  jobId?: string | null;
  jobStatus?: string | null;
  error?: string | null;
  errorLog?: string | null;
}

export interface FieldMatchingSummary {
  applicationId: string;
  totalFieldsCount: number;
  matchedFieldsCount: number;
  missingFieldsCount: number;
  confidenceAverage: number;
  mappings: FieldMappingDTO[];
  missingInformation: MissingInformationDTO[];
  status: ApplicationStatus;
}

export interface ReviewFieldItem {
  fieldId: string;
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  options?: string[] | null;
  isRequired: boolean;
  pageNumber: number;
  mappedValue: string | null;
  sourceType: MappingSourceType | null;
  sourcePath?: string | null;
  confidence: number;
  isEditedByUser: boolean;
  isResolved: boolean;
}

export interface ReviewSection {
  name: string;
  pageNumber: number;
  fields: ReviewFieldItem[];
}

export interface ReviewDocumentItem {
  id: string;
  name: string;
  category: DocumentCategory;
  mimeType: string;
  sizeBytes: number;
  fileKey: string;
  fileUrl?: string | null;
  targetFieldKey?: string | null;
  attachedAt: string;
}

export interface ApplicationReviewDTO {
  applicationId: string;
  status: ApplicationStatus;
  userApprovedAt?: string | null;
  submittedAt?: string | null;
  scholarship: {
    id: string;
    title: string;
    providerName: string;
    websiteUrl: string;
    applicationUrl?: string | null;
    deadline?: string | null;
    fundingType: string;
  };
  previewScreenshotUrl?: string | null;
  summary: {
    totalFieldsCount: number;
    filledFieldsCount: number;
    unresolvedCount: number;
    missingCount: number;
    canAuthorizeSubmission: boolean;
    completionPercentage: number;
  };
  sections: ReviewSection[];
  attachedDocuments: ReviewDocumentItem[];
  unresolvedMissingItems: Array<{
    id: string;
    prompt: string;
    category: MissingInfoCategory;
    fieldId?: string | null;
    fieldLabel?: string;
  }>;
}

// ==========================================
// Browser Worker & Jobs
// ==========================================

export type ChallengeType =
  | 'CAPTCHA'
  | 'LOGIN_REQUIRED'
  | 'TWO_FACTOR_AUTH'
  | 'BOT_DETECTION';

export interface ChallengeDetectionResult {
  detected: boolean;
  challengeType: ChallengeType | null;
  reason: string | null;
  selectorFound: string | null;
  instructions: string;
}

export type BrowserSessionStatus =
  | 'INITIALIZING'
  | 'RUNNING'
  | 'PAUSED_FOR_USER'
  | 'COMPLETED'
  | 'ERROR';

export interface BrowserSessionDTO {
  id: string;
  applicationId?: string | null;
  jobId?: string | null;
  workerId: string;
  sessionStatus: BrowserSessionStatus;
  lastScreenshotUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AutomationJobType =
  | 'VERIFY_URL'
  | 'EXTRACT_FORM'
  | 'FILL_FORM'
  | 'SUBMIT_APPLICATION';

export type AutomationJobStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface AutomationJobDTO {
  id: string;
  applicationId?: string | null;
  type: AutomationJobType;
  bullJobId?: string | null;
  status: AutomationJobStatus;
  attempts: number;
  errorLog?: string | null;
}

// ==========================================
// Notifications
// ==========================================

export type NotificationType = 'INFO' | 'WARNING' | 'ACTION_REQUIRED' | 'SUCCESS';

export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

// ==========================================
// AI Service Types
// ==========================================

export type AIProviderType = 'GEMINI' | 'OPENROUTER';

export type AITaskType =
  | 'VERIFICATION'
  | 'ELIGIBILITY'
  | 'MATCHING'
  | 'ESSAY_DRAFT';

export interface AIRequestLogDTO {
  id: string;
  userId?: string | null;
  provider: AIProviderType;
  model: string;
  taskType: AITaskType;
  promptTokens: number;
  completionTokens: number;
  costEstimate?: number | null;
  latencyMs: number;
  status: 'SUCCESS' | 'FALLBACK' | 'FAILED';
  createdAt: string;
}

// ==========================================
// API Response Wrapper
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==========================================
// Admin Monitoring & Audit Types (TASK-030)
// ==========================================

export interface AdminSystemMetricsDTO {
  generatedAt: string;
  queues: {
    totalJobs: number;
    queued: number;
    active: number;
    completed: number;
    failed: number;
    activeBrowserSessions: number;
    pausedBrowserSessions: number;
    recentFailedJobs: Array<{
      id: string;
      applicationId: string | null;
      type: AutomationJobType;
      attempts: number;
      errorLog: string | null;
      updatedAt: string;
    }>;
  };
  ai: {
    totalRequests: number;
    totalTokens: number;
    totalEstimatedCostUSD: number;
    averageLatencyMs: number;
    fallbackRatePercent: number;
    failureRatePercent: number;
    byProvider: Record<
      string,
      {
        requests: number;
        tokens: number;
        costUSD: number;
        avgLatencyMs: number;
      }
    >;
  };
  users: {
    totalUsers: number;
    totalApplications: number;
    submittedApplications: number;
  };
}

export interface AdminAuditLogDTO {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
  timestamp: string;
}

export interface AdminAuditLogPageDTO {
  logs: AdminAuditLogDTO[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
