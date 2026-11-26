import {
  UserDTO,
  UserProfileDTO,
  ApiResponse,
  ApplicationDTO,
  ApplicationDashboardItemDTO,
  ScholarshipDTO,
  ScholarshipSourceDTO,
  EligibilityRequirementDTO,
  EligibilityResultDTO,
  VerificationStatus,
  EducationRecordDTO,
  LanguageSkillDTO,
  AchievementDTO,
  ExperienceDTO,
  DocumentDTO,
  DocumentCategory,
  ApplicationFieldDTO,
  FieldMappingDTO,
  MissingInformationDTO,
  MissingInfoDetailDTO,
  FieldMatchingSummary,
  EssayDraftResult,
  SubmissionStatusDTO,
  BrowserSessionDTO,
  ApplicationReviewDTO,
  AdminSystemMetricsDTO,
  AdminAuditLogDTO,
  AdminAuditLogPageDTO,
} from '@scholaris/types';
import {
  LoginInput,
  RegisterInput,
  AnalyzeScholarshipInput,
  UpdateProfileInput,
  EducationRecordInput,
  LanguageSkillInput,
  AchievementInput,
  ExperienceInput,
  PresignedUploadRequestInput,
  ConfirmUploadInput,
  DraftEssayInput,
  UpdateFieldMappingInput,
  ApproveApplicationInput,
  SubmitApplicationInput,
} from '@scholaris/validation';
import {
  PREVIEW_ADMIN_AUDIT_LOGS,
  PREVIEW_ADMIN_METRICS,
  PREVIEW_APPLICATIONS,
  PREVIEW_APPLICATION_DETAIL,
  PREVIEW_APPLICATION_REVIEW,
  PREVIEW_DOCUMENTS,
  PREVIEW_ELIGIBILITY,
  PREVIEW_FULL_PROFILE,
  PREVIEW_MISSING_INFO,
  PREVIEW_SCHOLARSHIPS,
  PREVIEW_SUBMISSION_STATUS,
} from './preview-data';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ScholarshipDetailDTO extends ScholarshipDTO {
  sources?: ScholarshipSourceDTO[];
  requirements?: EligibilityRequirementDTO[];
}

export interface ListScholarshipsParams {
  status?: VerificationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AnalyzeScholarshipResponse {
  scholarship: ScholarshipDetailDTO;
  isExisting: boolean;
}

export interface FullProfileDTO {
  profile: UserProfileDTO | null;
  education: EducationRecordDTO[];
  languages: LanguageSkillDTO[];
  achievements: AchievementDTO[];
  experiences: ExperienceDTO[];
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds?: number;
}

export interface PresignedDownloadResponse {
  downloadUrl: string;
  expiresInSeconds?: number;
}

export interface ApplicationDetailDTO extends ApplicationDTO {
  scholarship: ScholarshipDTO;
  fields: ApplicationFieldDTO[];
  fieldMappings: Array<FieldMappingDTO & { field?: ApplicationFieldDTO }>;
  missingInformation: Array<
    MissingInformationDTO & { field?: ApplicationFieldDTO | null }
  >;
  applicationDocuments?: Array<{
    id: string;
    documentId: string;
    targetFieldKey?: string | null;
    document: DocumentDTO;
  }>;
  browserSessions?: BrowserSessionDTO[];
}

export interface AdminAuditQueryParams {
  userId?: string;
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}

export interface AuthResponseData {
  user: UserDTO;
  profile?: UserProfileDTO | null;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

class ApiClient {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('scholaris_access_token');
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('scholaris_refresh_token');
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('scholaris_access_token', accessToken);
    localStorage.setItem('scholaris_refresh_token', refreshToken);
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('scholaris_access_token');
    localStorage.removeItem('scholaris_refresh_token');
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const json: ApiResponse<{ accessToken: string; refreshToken: string }> =
        await response.json();
      if (json.success && json.data) {
        this.setTokens(json.data.accessToken, json.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async requestRaw<T>(
    endpoint: string,
    options: RequestInit = {},
    allowRefresh = true
  ): Promise<ApiResponse<T> & { pagination?: PaginationMeta }> {
    const token = this.getAccessToken();
    const headers = new Headers(options.headers);

    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401 && allowRefresh && this.getRefreshToken()) {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          return this.requestRaw<T>(endpoint, options, false);
        }
        this.clearTokens();
      }

      const json: ApiResponse<T> & { pagination?: PaginationMeta } = await response.json();
      if (!response.ok || !json.success) {
        throw new ApiError(
          json.error?.code || 'API_ERROR',
          json.error?.message || response.statusText || 'Request failed',
          response.status,
          json.error?.details
        );
      }
      return json;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        'NETWORK_ERROR',
        err instanceof Error ? err.message : 'Unable to connect to Scholaris server',
        0
      );
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    allowRefresh = true
  ): Promise<T> {
    const json = await this.requestRaw<T>(endpoint, options, allowRefresh);
    return json.data as T;
  }

  async login(input: LoginInput): Promise<AuthResponseData> {
    const data = await this.request<AuthResponseData>(
      '/api/v1/auth/login',
      { method: 'POST', body: JSON.stringify(input) },
      false
    );
    this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    return data;
  }

  async register(input: RegisterInput): Promise<AuthResponseData> {
    const data = await this.request<AuthResponseData>(
      '/api/v1/auth/register',
      { method: 'POST', body: JSON.stringify(input) },
      false
    );
    this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    return data;
  }

  async getMe(): Promise<{ user: UserDTO; profile: UserProfileDTO | null }> {
    return this.request<{ user: UserDTO; profile: UserProfileDTO | null }>('/api/v1/auth/me');
  }

  private async withPreviewFallback<T>(
    loader: () => Promise<T>,
    fallback: () => T
  ): Promise<T> {
    if (!this.getAccessToken()) {
      return fallback();
    }
    try {
      return await loader();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 0) {
        return fallback();
      }
      throw err;
    }
  }

  async listApplications(): Promise<ApplicationDashboardItemDTO[]> {
    return this.withPreviewFallback(
      () => this.request<ApplicationDashboardItemDTO[]>('/api/v1/applications'),
      () => PREVIEW_APPLICATIONS
    );
  }

  async createApplication(scholarshipId: string): Promise<ApplicationDTO> {
    return this.request<ApplicationDTO>('/api/v1/applications', {
      method: 'POST',
      body: JSON.stringify({ scholarshipId }),
    });
  }

  async listScholarships(params: ListScholarshipsParams = {}): Promise<{
    items: ScholarshipDTO[];
    pagination: PaginationMeta;
  }> {
    return this.withPreviewFallback(
      async () => {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.set('status', params.status);
        if (params.search?.trim()) searchParams.set('search', params.search.trim());
        if (params.page) searchParams.set('page', String(params.page));
        if (params.limit) searchParams.set('limit', String(params.limit));

        const query = searchParams.toString();
        const res = await this.requestRaw<ScholarshipDTO[]>(
          `/api/v1/scholarships${query ? `?${query}` : ''}`
        );

        return {
          items: res.data ?? [],
          pagination: res.pagination ?? {
            page: params.page ?? 1,
            limit: params.limit ?? 20,
            total: (res.data ?? []).length,
            totalPages: 1,
          },
        };
      },
      () => {
        const filtered = PREVIEW_SCHOLARSHIPS.filter((item) => {
          const matchesStatus = !params.status || item.verificationStatus === params.status;
          const q = params.search?.trim().toLowerCase();
          const matchesSearch =
            !q ||
            item.title.toLowerCase().includes(q) ||
            item.providerName.toLowerCase().includes(q);
          return matchesStatus && matchesSearch;
        });
        return {
          items: filtered,
          pagination: { page: 1, limit: 12, total: filtered.length, totalPages: 1 },
        };
      }
    );
  }

  async getScholarship(id: string): Promise<ScholarshipDetailDTO> {
    return this.withPreviewFallback(
      () => this.request<ScholarshipDetailDTO>(`/api/v1/scholarships/${id}`),
      () =>
        PREVIEW_SCHOLARSHIPS.find((s) => s.id === id) ?? PREVIEW_SCHOLARSHIPS[0]
    );
  }

  async analyzeScholarship(
    input: AnalyzeScholarshipInput
  ): Promise<AnalyzeScholarshipResponse> {
    return this.request<AnalyzeScholarshipResponse>('/api/v1/scholarships/analyze', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async verifyScholarship(id: string): Promise<ScholarshipDetailDTO> {
    return this.request<ScholarshipDetailDTO>(`/api/v1/scholarships/${id}/verify`, {
      method: 'POST',
    });
  }

  async extractRequirements(id: string): Promise<EligibilityRequirementDTO[]> {
    return this.request<EligibilityRequirementDTO[]>(
      `/api/v1/scholarships/${id}/requirements/extract`,
      { method: 'POST' }
    );
  }

  async evaluateEligibility(id: string): Promise<EligibilityResultDTO> {
    return this.request<EligibilityResultDTO>(
      `/api/v1/scholarships/${id}/eligibility/check`,
      { method: 'POST' }
    );
  }

  async getEligibilityResult(id: string): Promise<EligibilityResultDTO | null> {
    return this.withPreviewFallback(
      async () => {
        try {
          return await this.request<EligibilityResultDTO>(
            `/api/v1/scholarships/${id}/eligibility`
          );
        } catch (err) {
          if (err instanceof ApiError && err.statusCode === 404) {
            return null;
          }
          throw err;
        }
      },
      () => PREVIEW_ELIGIBILITY
    );
  }

  async getFullProfile(): Promise<FullProfileDTO> {
    return this.withPreviewFallback(
      () => this.request<FullProfileDTO>('/api/v1/profile'),
      () => PREVIEW_FULL_PROFILE
    );
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfileDTO> {
    return this.request<UserProfileDTO>('/api/v1/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  private async createProfileItem<T, TInput>(path: string, input: TInput): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  private async updateProfileItem<T, TInput>(
    path: string,
    id: string,
    input: Partial<TInput>
  ): Promise<T> {
    return this.request<T>(`${path}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  private async deleteProfileItem(path: string, id: string): Promise<void> {
    await this.request<unknown>(`${path}/${id}`, { method: 'DELETE' });
  }

  createEducation = (input: EducationRecordInput) =>
    this.createProfileItem<EducationRecordDTO, EducationRecordInput>('/api/v1/profile/education', input);
  updateEducation = (id: string, input: Partial<EducationRecordInput>) =>
    this.updateProfileItem<EducationRecordDTO, EducationRecordInput>('/api/v1/profile/education', id, input);
  deleteEducation = (id: string) =>
    this.deleteProfileItem('/api/v1/profile/education', id);

  createLanguage = (input: LanguageSkillInput) =>
    this.createProfileItem<LanguageSkillDTO, LanguageSkillInput>('/api/v1/profile/languages', input);
  updateLanguage = (id: string, input: Partial<LanguageSkillInput>) =>
    this.updateProfileItem<LanguageSkillDTO, LanguageSkillInput>('/api/v1/profile/languages', id, input);
  deleteLanguage = (id: string) =>
    this.deleteProfileItem('/api/v1/profile/languages', id);

  createAchievement = (input: AchievementInput) =>
    this.createProfileItem<AchievementDTO, AchievementInput>('/api/v1/profile/achievements', input);
  updateAchievement = (id: string, input: Partial<AchievementInput>) =>
    this.updateProfileItem<AchievementDTO, AchievementInput>('/api/v1/profile/achievements', id, input);
  deleteAchievement = (id: string) =>
    this.deleteProfileItem('/api/v1/profile/achievements', id);

  createExperience = (input: ExperienceInput) =>
    this.createProfileItem<ExperienceDTO, ExperienceInput>('/api/v1/profile/experiences', input);
  updateExperience = (id: string, input: Partial<ExperienceInput>) =>
    this.updateProfileItem<ExperienceDTO, ExperienceInput>('/api/v1/profile/experiences', id, input);
  deleteExperience = (id: string) =>
    this.deleteProfileItem('/api/v1/profile/experiences', id);

  async listDocuments(category?: DocumentCategory): Promise<DocumentDTO[]> {
    return this.withPreviewFallback(
      () => {
        const query = category ? `?category=${encodeURIComponent(category)}` : '';
        return this.request<DocumentDTO[]>(`/api/v1/documents${query}`);
      },
      () =>
        category
          ? PREVIEW_DOCUMENTS.filter((d) => d.category === category)
          : PREVIEW_DOCUMENTS
    );
  }

  async getPresignedUpload(
    input: PresignedUploadRequestInput
  ): Promise<PresignedUploadResponse> {
    return this.request<PresignedUploadResponse>('/api/v1/documents/presigned-upload', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async confirmUpload(input: ConfirmUploadInput): Promise<DocumentDTO> {
    return this.request<DocumentDTO>('/api/v1/documents/confirm-upload', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getDocumentDownloadUrl(id: string): Promise<PresignedDownloadResponse> {
    return this.request<PresignedDownloadResponse>(`/api/v1/documents/${id}/download`);
  }

  async reprocessDocument(id: string): Promise<DocumentDTO> {
    return this.request<DocumentDTO>(`/api/v1/documents/${id}/reprocess`, {
      method: 'POST',
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<unknown>(`/api/v1/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async getApplication(id: string): Promise<ApplicationDetailDTO> {
    return this.withPreviewFallback(
      () => this.request<ApplicationDetailDTO>(`/api/v1/applications/${id}`),
      () => ({ ...PREVIEW_APPLICATION_DETAIL, id })
    );
  }

  async matchFields(id: string): Promise<FieldMatchingSummary> {
    return this.request<FieldMatchingSummary>(
      `/api/v1/applications/${id}/match-fields`,
      { method: 'POST' }
    );
  }

  async updateFieldMapping(
    id: string,
    input: UpdateFieldMappingInput
  ): Promise<FieldMappingDTO> {
    return this.request<FieldMappingDTO>(
      `/api/v1/applications/${id}/field-mappings`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
  }

  async getMissingInfo(id: string): Promise<MissingInfoDetailDTO[]> {
    return this.withPreviewFallback(
      () => this.request<MissingInfoDetailDTO[]>(`/api/v1/applications/${id}/missing-info`),
      () => PREVIEW_MISSING_INFO
    );
  }

  async updateMissingInfo(
    id: string,
    infoId: string,
    userResponse: string
  ): Promise<MissingInformationDTO> {
    return this.request<MissingInformationDTO>(
      `/api/v1/applications/${id}/missing-info/${infoId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ userResponse }),
      }
    );
  }

  async draftEssay(
    id: string,
    input: DraftEssayInput
  ): Promise<EssayDraftResult> {
    return this.request<EssayDraftResult>(
      `/api/v1/applications/${id}/draft-essay`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  }

  async getSubmissionStatus(id: string): Promise<SubmissionStatusDTO> {
    return this.withPreviewFallback(
      () =>
        this.request<SubmissionStatusDTO>(
          `/api/v1/applications/${id}/submission-status`
        ),
      () => ({ ...PREVIEW_SUBMISSION_STATUS, applicationId: id })
    );
  }

  async getApplicationReview(id: string): Promise<ApplicationReviewDTO> {
    return this.withPreviewFallback(
      () =>
        this.request<ApplicationReviewDTO>(`/api/v1/applications/${id}/review`),
      () => ({ ...PREVIEW_APPLICATION_REVIEW, applicationId: id })
    );
  }

  async approveApplication(
    id: string,
    input: ApproveApplicationInput
  ): Promise<ApplicationDTO> {
    return this.request<ApplicationDTO>(`/api/v1/applications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async submitApplication(
    id: string,
    input: SubmitApplicationInput = { confirmed: true }
  ): Promise<SubmissionStatusDTO> {
    return this.request<SubmissionStatusDTO>(`/api/v1/applications/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getAdminMetrics(): Promise<AdminSystemMetricsDTO> {
    return this.withPreviewFallback(
      () => this.request<AdminSystemMetricsDTO>('/api/v1/admin/metrics'),
      () => PREVIEW_ADMIN_METRICS
    );
  }

  async getAdminAuditLogs(
    params: AdminAuditQueryParams = {}
  ): Promise<AdminAuditLogPageDTO> {
    return this.withPreviewFallback(
      async () => {
        const sp = new URLSearchParams();
        if (params.userId?.trim()) sp.set('userId', params.userId.trim());
        if (params.action?.trim()) sp.set('action', params.action.trim());
        if (params.entityType?.trim()) sp.set('entityType', params.entityType.trim());
        if (params.page) sp.set('page', String(params.page));
        if (params.limit) sp.set('limit', String(params.limit));

        const query = sp.toString();
        const res = await this.requestRaw<AdminAuditLogDTO[]>(
          `/api/v1/admin/audit-logs${query ? `?${query}` : ''}`
        );
        const meta = (res.meta as AdminAuditLogPageDTO['meta'] | undefined) ?? {
          total: (res.data ?? []).length,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          totalPages: 1,
        };
        return {
          logs: res.data ?? [],
          meta,
        };
      },
      () => PREVIEW_ADMIN_AUDIT_LOGS
    );
  }
}

export const api = new ApiClient();
