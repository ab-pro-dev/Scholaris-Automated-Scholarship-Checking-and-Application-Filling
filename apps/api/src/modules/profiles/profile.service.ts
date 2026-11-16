import { PrismaClient } from '@scholaris/database';
import {
  UserProfileDTO,
  EducationRecordDTO,
  LanguageSkillDTO,
  AchievementDTO,
  ExperienceDTO,
} from '@scholaris/types';
import { NotFoundError } from '@scholaris/shared';
import {
  UpdateProfileInput,
  EducationRecordInput,
  LanguageSkillInput,
  AchievementInput,
  ExperienceInput,
} from '@scholaris/validation';

export interface FullProfileResult {
  profile: UserProfileDTO | null;
  education: EducationRecordDTO[];
  languages: LanguageSkillDTO[];
  achievements: AchievementDTO[];
  experiences: ExperienceDTO[];
}

export class ProfileService {
  constructor(private readonly prisma: PrismaClient) {}

  // ==========================================
  // Basic Personal & Contact Profile
  // ==========================================

  async getFullProfile(userId: string): Promise<FullProfileResult> {
    const [profile, education, languages, achievements, experiences] =
      await Promise.all([
        this.prisma.userProfile.findUnique({ where: { userId } }),
        this.prisma.educationRecord.findMany({
          where: { userId },
          orderBy: { startDate: 'desc' },
        }),
        this.prisma.languageSkill.findMany({
          where: { userId },
          orderBy: { language: 'asc' },
        }),
        this.prisma.achievement.findMany({
          where: { userId },
          orderBy: { dateReceived: 'desc' },
        }),
        this.prisma.experience.findMany({
          where: { userId },
          orderBy: { startDate: 'desc' },
        }),
      ]);

    return {
      profile: profile ? this.mapProfileToDTO(profile) : null,
      education: education.map(this.mapEducationToDTO),
      languages: languages.map(this.mapLanguageToDTO),
      achievements: achievements.map(this.mapAchievementToDTO),
      experiences: experiences.map(this.mapExperienceToDTO),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfileDTO> {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundError('User profile not found');
    }

    const firstName = input.firstName ?? existing.firstName;
    const lastName = input.lastName ?? existing.lastName;
    const middleName = input.middleName !== undefined ? input.middleName : existing.middleName;
    const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();

    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        firstName,
        middleName,
        lastName,
        fullName,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : existing.dateOfBirth,
        gender: input.gender !== undefined ? input.gender : existing.gender,
        nationality: input.nationality ?? existing.nationality,
        residenceCountry: input.residenceCountry ?? existing.residenceCountry,
        city: input.city ?? existing.city,
        address: input.address !== undefined ? input.address : existing.address,
        phone: input.phone !== undefined ? input.phone : existing.phone,
        altEmail: input.altEmail !== undefined ? input.altEmail : existing.altEmail,
        familyIncomeTier: input.familyIncomeTier !== undefined ? input.familyIncomeTier : existing.familyIncomeTier,
        financialStatement: input.financialStatement !== undefined ? input.financialStatement : existing.financialStatement,
      },
    });

    return this.mapProfileToDTO(updated);
  }

  // ==========================================
  // Education Records
  // ==========================================

  async listEducation(userId: string): Promise<EducationRecordDTO[]> {
    const records = await this.prisma.educationRecord.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
    return records.map(this.mapEducationToDTO);
  }

  async createEducation(userId: string, input: EducationRecordInput): Promise<EducationRecordDTO> {
    const record = await this.prisma.educationRecord.create({
      data: {
        userId,
        level: input.level,
        institution: input.institution,
        faculty: input.faculty ?? null,
        degree: input.degree ?? null,
        fieldOfStudy: input.fieldOfStudy,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        isCurrent: input.isCurrent,
        gpa: input.gpa ?? null,
        maxGpa: input.maxGpa ?? null,
        honors: input.honors ?? null,
      },
    });
    return this.mapEducationToDTO(record);
  }

  async updateEducation(
    userId: string,
    recordId: string,
    input: Partial<EducationRecordInput>
  ): Promise<EducationRecordDTO> {
    const existing = await this.prisma.educationRecord.findFirst({
      where: { id: recordId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Education record not found or access denied');
    }

    const updated = await this.prisma.educationRecord.update({
      where: { id: recordId },
      data: {
        level: input.level ?? existing.level,
        institution: input.institution ?? existing.institution,
        faculty: input.faculty !== undefined ? input.faculty : existing.faculty,
        degree: input.degree !== undefined ? input.degree : existing.degree,
        fieldOfStudy: input.fieldOfStudy ?? existing.fieldOfStudy,
        startDate: input.startDate ? new Date(input.startDate) : existing.startDate,
        endDate: input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : existing.endDate,
        isCurrent: input.isCurrent !== undefined ? input.isCurrent : existing.isCurrent,
        gpa: input.gpa !== undefined ? input.gpa : existing.gpa,
        maxGpa: input.maxGpa !== undefined ? input.maxGpa : existing.maxGpa,
        honors: input.honors !== undefined ? input.honors : existing.honors,
      },
    });

    return this.mapEducationToDTO(updated);
  }

  async deleteEducation(userId: string, recordId: string): Promise<void> {
    const existing = await this.prisma.educationRecord.findFirst({
      where: { id: recordId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Education record not found or access denied');
    }

    await this.prisma.educationRecord.delete({
      where: { id: recordId },
    });
  }

  // ==========================================
  // Language Skills
  // ==========================================

  async listLanguages(userId: string): Promise<LanguageSkillDTO[]> {
    const records = await this.prisma.languageSkill.findMany({
      where: { userId },
      orderBy: { language: 'asc' },
    });
    return records.map(this.mapLanguageToDTO);
  }

  async createLanguage(userId: string, input: LanguageSkillInput): Promise<LanguageSkillDTO> {
    const record = await this.prisma.languageSkill.create({
      data: {
        userId,
        language: input.language,
        isNative: input.isNative,
        proficiencyLevel: input.proficiencyLevel ?? null,
        testType: input.testType ?? null,
        testScore: input.testScore ?? null,
        testDate: input.testDate ? new Date(input.testDate) : null,
      },
    });
    return this.mapLanguageToDTO(record);
  }

  async updateLanguage(
    userId: string,
    skillId: string,
    input: Partial<LanguageSkillInput>
  ): Promise<LanguageSkillDTO> {
    const existing = await this.prisma.languageSkill.findFirst({
      where: { id: skillId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Language skill not found or access denied');
    }

    const updated = await this.prisma.languageSkill.update({
      where: { id: skillId },
      data: {
        language: input.language ?? existing.language,
        isNative: input.isNative !== undefined ? input.isNative : existing.isNative,
        proficiencyLevel: input.proficiencyLevel !== undefined ? input.proficiencyLevel : existing.proficiencyLevel,
        testType: input.testType !== undefined ? input.testType : existing.testType,
        testScore: input.testScore !== undefined ? input.testScore : existing.testScore,
        testDate: input.testDate !== undefined ? (input.testDate ? new Date(input.testDate) : null) : existing.testDate,
      },
    });

    return this.mapLanguageToDTO(updated);
  }

  async deleteLanguage(userId: string, skillId: string): Promise<void> {
    const existing = await this.prisma.languageSkill.findFirst({
      where: { id: skillId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Language skill not found or access denied');
    }

    await this.prisma.languageSkill.delete({
      where: { id: skillId },
    });
  }

  // ==========================================
  // Achievements
  // ==========================================

  async listAchievements(userId: string): Promise<AchievementDTO[]> {
    const records = await this.prisma.achievement.findMany({
      where: { userId },
      orderBy: { dateReceived: 'desc' },
    });
    return records.map(this.mapAchievementToDTO);
  }

  async createAchievement(userId: string, input: AchievementInput): Promise<AchievementDTO> {
    const record = await this.prisma.achievement.create({
      data: {
        userId,
        title: input.title,
        issuer: input.issuer ?? null,
        dateReceived: input.dateReceived ? new Date(input.dateReceived) : null,
        description: input.description ?? null,
      },
    });
    return this.mapAchievementToDTO(record);
  }

  async updateAchievement(
    userId: string,
    achievementId: string,
    input: Partial<AchievementInput>
  ): Promise<AchievementDTO> {
    const existing = await this.prisma.achievement.findFirst({
      where: { id: achievementId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Achievement record not found or access denied');
    }

    const updated = await this.prisma.achievement.update({
      where: { id: achievementId },
      data: {
        title: input.title ?? existing.title,
        issuer: input.issuer !== undefined ? input.issuer : existing.issuer,
        dateReceived: input.dateReceived !== undefined ? (input.dateReceived ? new Date(input.dateReceived) : null) : existing.dateReceived,
        description: input.description !== undefined ? input.description : existing.description,
      },
    });

    return this.mapAchievementToDTO(updated);
  }

  async deleteAchievement(userId: string, achievementId: string): Promise<void> {
    const existing = await this.prisma.achievement.findFirst({
      where: { id: achievementId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Achievement record not found or access denied');
    }

    await this.prisma.achievement.delete({
      where: { id: achievementId },
    });
  }

  // ==========================================
  // Experiences
  // ==========================================

  async listExperiences(userId: string): Promise<ExperienceDTO[]> {
    const records = await this.prisma.experience.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
    return records.map(this.mapExperienceToDTO);
  }

  async createExperience(userId: string, input: ExperienceInput): Promise<ExperienceDTO> {
    const record = await this.prisma.experience.create({
      data: {
        userId,
        type: input.type,
        organization: input.organization,
        roleTitle: input.roleTitle,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        isCurrent: input.isCurrent,
        description: input.description ?? null,
      },
    });
    return this.mapExperienceToDTO(record);
  }

  async updateExperience(
    userId: string,
    experienceId: string,
    input: Partial<ExperienceInput>
  ): Promise<ExperienceDTO> {
    const existing = await this.prisma.experience.findFirst({
      where: { id: experienceId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Experience record not found or access denied');
    }

    const updated = await this.prisma.experience.update({
      where: { id: experienceId },
      data: {
        type: input.type ?? existing.type,
        organization: input.organization ?? existing.organization,
        roleTitle: input.roleTitle ?? existing.roleTitle,
        startDate: input.startDate ? new Date(input.startDate) : existing.startDate,
        endDate: input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : existing.endDate,
        isCurrent: input.isCurrent !== undefined ? input.isCurrent : existing.isCurrent,
        description: input.description !== undefined ? input.description : existing.description,
      },
    });

    return this.mapExperienceToDTO(updated);
  }

  async deleteExperience(userId: string, experienceId: string): Promise<void> {
    const existing = await this.prisma.experience.findFirst({
      where: { id: experienceId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Experience record not found or access denied');
    }

    await this.prisma.experience.delete({
      where: { id: experienceId },
    });
  }

  // ==========================================
  // Private DTO Mappers
  // ==========================================

  private mapProfileToDTO(profile: any): UserProfileDTO {
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      fullName: profile.fullName,
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString() : null,
      gender: profile.gender,
      nationality: profile.nationality,
      residenceCountry: profile.residenceCountry,
      city: profile.city,
      address: profile.address,
      phone: profile.phone,
      altEmail: profile.altEmail,
      passportNumberEncrypted: profile.passportNumberEncrypted,
      familyIncomeTier: profile.familyIncomeTier,
      financialStatement: profile.financialStatement,
      createdAt: new Date(profile.createdAt).toISOString(),
      updatedAt: new Date(profile.updatedAt).toISOString(),
    };
  }

  private mapEducationToDTO(record: any): EducationRecordDTO {
    return {
      id: record.id,
      userId: record.userId,
      level: record.level,
      institution: record.institution,
      faculty: record.faculty,
      degree: record.degree,
      fieldOfStudy: record.fieldOfStudy,
      startDate: new Date(record.startDate).toISOString(),
      endDate: record.endDate ? new Date(record.endDate).toISOString() : null,
      isCurrent: record.isCurrent,
      gpa: record.gpa,
      maxGpa: record.maxGpa,
      honors: record.honors,
    };
  }

  private mapLanguageToDTO(record: any): LanguageSkillDTO {
    return {
      id: record.id,
      userId: record.userId,
      language: record.language,
      isNative: record.isNative,
      proficiencyLevel: record.proficiencyLevel,
      testType: record.testType,
      testScore: record.testScore,
      testDate: record.testDate ? new Date(record.testDate).toISOString() : null,
    };
  }

  private mapAchievementToDTO(record: any): AchievementDTO {
    return {
      id: record.id,
      userId: record.userId,
      title: record.title,
      issuer: record.issuer,
      dateReceived: record.dateReceived ? new Date(record.dateReceived).toISOString() : null,
      description: record.description,
    };
  }

  private mapExperienceToDTO(record: any): ExperienceDTO {
    return {
      id: record.id,
      userId: record.userId,
      type: record.type,
      organization: record.organization,
      roleTitle: record.roleTitle,
      startDate: new Date(record.startDate).toISOString(),
      endDate: record.endDate ? new Date(record.endDate).toISOString() : null,
      isCurrent: record.isCurrent,
      description: record.description,
    };
  }
}
