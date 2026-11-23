import {
  UserDTO,
  UserProfileDTO,
  EducationRecordDTO,
  LanguageSkillDTO,
  AchievementDTO,
  ExperienceDTO,
  DocumentDTO,
  DocumentCategory,
  OCRStatus,
  ScholarshipDTO,
  ScholarshipSourceDTO,
  VerificationStatus,
  FundingType,
  ApiResponse,
  EligibilityStatus,
  EligibilityRequirementDTO,
  EligibilityCriterionResult,
  EligibilityEvaluationSummary,
  EligibilityResultDTO,
} from '@scholaris/types';
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  EducationRecordInput,
  LanguageSkillInput,
  AchievementInput,
  ExperienceInput,
  PresignedUploadRequestInput,
  ConfirmUploadInput,
  AnalyzeScholarshipInput,
} from '@scholaris/validation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FullProfileData {
  profile: UserProfileDTO | null;
  education: EducationRecordDTO[];
  languages: LanguageSkillDTO[];
  achievements: AchievementDTO[];
  experiences: ExperienceDTO[];
}

export interface AuthResponseData {
  user: UserDTO;
  profile: UserProfileDTO;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface ScholarshipWithSources extends ScholarshipDTO {
  sources: ScholarshipSourceDTO[];
}

export interface AnalyzeScholarshipResponse {
  scholarship: ScholarshipWithSources;
  isExisting: boolean;
  extractedPreview: {
    title: string;
    description?: string;
    cleanTextSnippet: string;
    finalUrl: string;
    contentLengthBytes: number;
  };
}

export interface VerificationResultData {
  scholarshipId: string;
  status: VerificationStatus;
  confidenceScore: number;
  institutionMatch: boolean;
  scamFlags: string[];
  summary: string;
  evidenceNotes: string;
  isEligibleForAutoFill: boolean;
  aiMetrics: {
    model: string;
    latencyMs: number;
    tokensUsed: number;
    costUSD?: number;
  };
}

class ApiError extends Error {
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

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('scholaris_access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('scholaris_refresh_token');
  }

  public setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('scholaris_access_token', accessToken);
    localStorage.setItem('scholaris_refresh_token', refreshToken);
  }

  public clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('scholaris_access_token');
    localStorage.removeItem('scholaris_refresh_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuth = true
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized by attempting a token refresh
      if (response.status === 401 && retryOnAuth) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshData: ApiResponse<{ accessToken: string; refreshToken: string }> =
                await refreshRes.json();
              if (refreshData.data) {
                this.setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
                // Retry the original request once with new token
                return this.request<T>(endpoint, options, false);
              }
            }
          } catch {
            this.clearTokens();
          }
        }
        this.clearTokens();
      }

      const json: ApiResponse<T> = await response.json();

      if (!response.ok || !json.success) {
        throw new ApiError(
          json.error?.code || 'API_ERROR',
          json.error?.message || response.statusText || 'Unknown error occurred',
          response.status,
          json.error?.details
        );
      }

      return json.data as T;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(
        'NETWORK_ERROR',
        err instanceof Error ? err.message : 'Unable to connect to Scholaris server',
        0
      );
    }
  }

  // ==========================================
  // Auth API Endpoints
  // ==========================================

  async register(input: RegisterInput): Promise<AuthResponseData> {
    const data = await this.request<AuthResponseData>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    return data;
  }

  async login(input: LoginInput): Promise<AuthResponseData> {
    const data = await this.request<AuthResponseData>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    return data;
  }

  async getMe(): Promise<{ user: UserDTO; profile: UserProfileDTO | null }> {
    return this.request<{ user: UserDTO; profile: UserProfileDTO | null }>('/api/v1/auth/me', {
      method: 'GET',
    });
  }

  // ==========================================
  // Profile API Endpoints
  // ==========================================

  async getFullProfile(): Promise<FullProfileData> {
    return this.request<FullProfileData>('/api/v1/profile', {
      method: 'GET',
    });
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfileDTO> {
    return this.request<UserProfileDTO>('/api/v1/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // Education Records
  async listEducation(): Promise<EducationRecordDTO[]> {
    return this.request<EducationRecordDTO[]>('/api/v1/profile/education', {
      method: 'GET',
    });
  }

  async createEducation(input: EducationRecordInput): Promise<EducationRecordDTO> {
    return this.request<EducationRecordDTO>('/api/v1/profile/education', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateEducation(
    id: string,
    input: Partial<EducationRecordInput>
  ): Promise<EducationRecordDTO> {
    return this.request<EducationRecordDTO>(`/api/v1/profile/education/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteEducation(id: string): Promise<void> {
    await this.request<{ message: string }>(`/api/v1/profile/education/${id}`, {
      method: 'DELETE',
    });
  }

  // Language Skills
  async listLanguages(): Promise<LanguageSkillDTO[]> {
    return this.request<LanguageSkillDTO[]>('/api/v1/profile/languages', {
      method: 'GET',
    });
  }

  async createLanguage(input: LanguageSkillInput): Promise<LanguageSkillDTO> {
    return this.request<LanguageSkillDTO>('/api/v1/profile/languages', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateLanguage(
    id: string,
    input: Partial<LanguageSkillInput>
  ): Promise<LanguageSkillDTO> {
    return this.request<LanguageSkillDTO>(`/api/v1/profile/languages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteLanguage(id: string): Promise<void> {
    await this.request<{ message: string }>(`/api/v1/profile/languages/${id}`, {
      method: 'DELETE',
    });
  }

  // Achievements
  async listAchievements(): Promise<AchievementDTO[]> {
    return this.request<AchievementDTO[]>('/api/v1/profile/achievements', {
      method: 'GET',
    });
  }

  async createAchievement(input: AchievementInput): Promise<AchievementDTO> {
    return this.request<AchievementDTO>('/api/v1/profile/achievements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateAchievement(
    id: string,
    input: Partial<AchievementInput>
  ): Promise<AchievementDTO> {
    return this.request<AchievementDTO>(`/api/v1/profile/achievements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteAchievement(id: string): Promise<void> {
    await this.request<{ message: string }>(`/api/v1/profile/achievements/${id}`, {
      method: 'DELETE',
    });
  }

  // Experiences
  async listExperiences(): Promise<ExperienceDTO[]> {
    return this.request<ExperienceDTO[]>('/api/v1/profile/experiences', {
      method: 'GET',
    });
  }

  async createExperience(input: ExperienceInput): Promise<ExperienceDTO> {
    return this.request<ExperienceDTO>('/api/v1/profile/experiences', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateExperience(
    id: string,
    input: Partial<ExperienceInput>
  ): Promise<ExperienceDTO> {
    return this.request<ExperienceDTO>(`/api/v1/profile/experiences/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteExperience(id: string): Promise<void> {
    await this.request<{ message: string }>(`/api/v1/profile/experiences/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // Document Vault API Endpoints
  // ==========================================

  async getPresignedUpload(input: PresignedUploadRequestInput): Promise<{
    uploadUrl: string;
    fileKey: string;
    expiresInSeconds: number;
  }> {
    return this.request<{
      uploadUrl: string;
      fileKey: string;
      expiresInSeconds: number;
    }>('/api/v1/documents/presigned-upload', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async uploadToS3(
    uploadUrl: string,
    file: File | Blob,
    mimeType: string,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new ApiError('UPLOAD_FAILED', `S3 storage error: ${xhr.statusText || xhr.status}`, xhr.status));
        }
      };

      xhr.onerror = () => {
        reject(new ApiError('NETWORK_ERROR', 'Network error during file upload to storage', 0));
      };

      xhr.send(file);
    });
  }

  async confirmUpload(input: ConfirmUploadInput): Promise<DocumentDTO> {
    return this.request<DocumentDTO>('/api/v1/documents/confirm-upload', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listDocuments(category?: DocumentCategory): Promise<DocumentDTO[]> {
    const query = category ? `?category=${category}` : '';
    return this.request<DocumentDTO[]>(`/api/v1/documents${query}`, {
      method: 'GET',
    });
  }

  async getDownloadUrl(id: string): Promise<{
    downloadUrl: string;
    expiresInSeconds: number;
    document: DocumentDTO;
  }> {
    return this.request<{
      downloadUrl: string;
      expiresInSeconds: number;
      document: DocumentDTO;
    }>(`/api/v1/documents/${id}/download`, {
      method: 'GET',
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<{ message: string }>(`/api/v1/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // Scholarship Ingestion & Verification
  // ==========================================

  async analyzeScholarship(input: AnalyzeScholarshipInput): Promise<AnalyzeScholarshipResponse> {
    return this.request<AnalyzeScholarshipResponse>('/api/v1/scholarships/analyze', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async verifyScholarship(id: string): Promise<VerificationResultData> {
    return this.request<VerificationResultData>(`/api/v1/scholarships/${id}/verify`, {
      method: 'POST',
    });
  }

  async getScholarship(id: string): Promise<ScholarshipWithSources> {
    return this.request<ScholarshipWithSources>(`/api/v1/scholarships/${id}`, {
      method: 'GET',
    });
  }

  async listScholarships(params?: {
    status?: VerificationStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ScholarshipWithSources[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

    return this.request<ScholarshipWithSources[]>(`/api/v1/scholarships${query}`, {
      method: 'GET',
    });
  }

  // ==========================================
  // Eligibility Matching & Requirements
  // ==========================================

  async checkEligibility(id: string): Promise<EligibilityResultDTO> {
    return this.request<EligibilityResultDTO>(`/api/v1/scholarships/${id}/eligibility/check`, {
      method: 'POST',
    });
  }

  async getEligibility(id: string): Promise<EligibilityResultDTO | null> {
    try {
      return await this.request<EligibilityResultDTO>(`/api/v1/scholarships/${id}/eligibility`, {
        method: 'GET',
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async extractRequirements(id: string): Promise<any> {
    return this.request<any>(`/api/v1/scholarships/${id}/requirements/extract`, {
      method: 'POST',
    });
  }

  async getRequirements(id: string): Promise<EligibilityRequirementDTO[]> {
    return this.request<EligibilityRequirementDTO[]>(`/api/v1/scholarships/${id}/requirements`, {
      method: 'GET',
    });
  }
}

export const api = new ApiClient();
export { ApiError };
