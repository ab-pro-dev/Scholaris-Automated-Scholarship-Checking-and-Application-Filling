import {
  UserDTO,
  UserProfileDTO,
  EducationRecordDTO,
  LanguageSkillDTO,
  AchievementDTO,
  ExperienceDTO,
  ApiResponse,
} from '@scholaris/types';
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  EducationRecordInput,
  LanguageSkillInput,
  AchievementInput,
  ExperienceInput,
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
}

export const api = new ApiClient();
export { ApiError };
