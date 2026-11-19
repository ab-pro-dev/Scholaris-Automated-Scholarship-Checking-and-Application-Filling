import {
  PrismaClient,
  EligibilityStatus,
  RequirementCategory,
  RequirementOperator,
  EducationLevel,
  LanguageTestType,
} from '@scholaris/database';
import {
  EligibilityCriterionResult,
  EligibilityEvaluationSummary,
  EligibilityResultDTO,
} from '@scholaris/types';
import { AppError } from '@scholaris/shared';
import { ScholarshipRequirementsService } from './scholarship-requirements.service.js';

// Common country aliases for robust ISO / name matching
const COUNTRY_ALIASES: Record<string, string[]> = {
  US: ['UNITED STATES', 'USA', 'UNITED STATES OF AMERICA', 'AMERICA', 'US'],
  UK: ['UNITED KINGDOM', 'GREAT BRITAIN', 'BRITAIN', 'ENGLAND', 'SCOTLAND', 'WALES', 'UK', 'GB'],
  ET: ['ETHIOPIA', 'ETHIOPIAN', 'ET'],
  KE: ['KENYA', 'KENYAN', 'KE'],
  NG: ['NIGERIA', 'NIGERIAN', 'NG'],
  GH: ['GHANA', 'GHANAIAN', 'GH'],
  UG: ['UGANDA', 'UGANDAN', 'UG'],
  TZ: ['TANZANIA', 'TANZANIAN', 'TZ'],
  RW: ['RWANDA', 'RWANDAN', 'RW'],
  ZA: ['SOUTH AFRICA', 'SOUTH AFRICAN', 'ZA'],
  IN: ['INDIA', 'INDIAN', 'IN'],
  PK: ['PAKISTAN', 'PAKISTANI', 'PK'],
  BD: ['BANGLADESH', 'BANGLADESHI', 'BD'],
  ID: ['INDONESIA', 'INDONESIAN', 'ID'],
  VN: ['VIETNAM', 'VIETNAMESE', 'VN'],
  BR: ['BRAZIL', 'BRAZILIAN', 'BR'],
  DE: ['GERMANY', 'GERMAN', 'DE'],
  FR: ['FRANCE', 'FRENCH', 'FR'],
  CA: ['CANADA', 'CANADIAN', 'CA'],
  AU: ['AUSTRALIA', 'AUSTRALIAN', 'AU'],
};

// Recognized developed economy markers for "DEVELOPING_COUNTRIES" exclusion
const DEVELOPED_ECONOMIES = new Set([
  'US', 'USA', 'UNITED STATES',
  'UK', 'GB', 'UNITED KINGDOM',
  'CA', 'CANADA',
  'AU', 'AUSTRALIA',
  'NZ', 'NEW ZEALAND',
  'DE', 'GERMANY',
  'FR', 'FRANCE',
  'JP', 'JAPAN',
  'CH', 'SWITZERLAND',
  'NO', 'NORWAY',
  'SE', 'SWEDEN',
  'NL', 'NETHERLANDS',
  'DK', 'DENMARK',
  'FI', 'FINLAND',
  'SG', 'SINGAPORE',
  'KR', 'SOUTH KOREA',
]);

const EDUCATION_LEVEL_RANKS: Record<EducationLevel, number> = {
  HIGH_SCHOOL: 1,
  UNDERGRADUATE: 2,
  POSTGRADUATE: 3,
  DOCTORAL: 4,
};

export class EligibilityMatcherService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly requirementsService?: ScholarshipRequirementsService
  ) {}

  /**
   * Evaluates student profile against scholarship eligibility requirements.
   * Produces detailed criterion breakdown, match score, and persistence in EligibilityResult.
   */
  async evaluateEligibility(
    scholarshipId: string,
    userId: string
  ): Promise<EligibilityResultDTO> {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: scholarshipId },
      include: { requirements: true },
    });

    if (!scholarship) {
      throw new AppError(`Scholarship with ID '${scholarshipId}' not found`, 404, 'NOT_FOUND');
    }

    // Safety rule: Block matching on SUSPICIOUS scholarships
    if (scholarship.verificationStatus === 'SUSPICIOUS') {
      throw new AppError(
        'Cannot evaluate eligibility on a scholarship flagged as SUSPICIOUS. Automated processing is blocked for security.',
        400,
        'SCHOLARSHIP_SUSPICIOUS'
      );
    }

    // If requirements are empty, auto-extract if requirementsService is available
    let requirements = scholarship.requirements;
    if (requirements.length === 0 && this.requirementsService) {
      const extraction = await this.requirementsService.extractRequirements(scholarshipId, userId);
      requirements = extraction.requirements as any;
    }

    // Fetch student's comprehensive profile data
    const [profile, educationRecords, languageSkills, achievements, experiences] =
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

    // Evaluate each requirement against student data
    const evaluations: EligibilityCriterionResult[] = requirements.map((req) =>
      this.evaluateCriterion(req, {
        profile,
        educationRecords,
        languageSkills,
        achievements,
        experiences,
      })
    );

    // Calculate aggregated statistics
    const mandatoryEvaluations = evaluations.filter((e) => e.isMandatory !== false);
    const preferredEvaluations = evaluations.filter((e) => e.isMandatory === false);

    const satisfiedCount = evaluations.filter((e) => e.isMet === true).length;
    const failedCount = evaluations.filter((e) => e.isMet === false).length;
    const unconfirmedCount = evaluations.filter((e) => e.isMet === null).length;
    const mandatorySatisfied = mandatoryEvaluations.filter((e) => e.isMet === true).length;
    const mandatoryTotal = mandatoryEvaluations.length;

    // Determine Overall Eligibility Status
    let status: EligibilityStatus;
    if (mandatoryEvaluations.some((e) => e.isMet === false)) {
      status = 'INELIGIBLE';
    } else if (mandatoryEvaluations.some((e) => e.isMet === null)) {
      status = 'INSUFFICIENT_INFO';
    } else if (mandatoryTotal > 0 && mandatorySatisfied === mandatoryTotal) {
      status = 'ELIGIBLE';
    } else if (mandatoryTotal === 0 && (satisfiedCount > 0 || evaluations.length === 0)) {
      status = 'ELIGIBLE';
    } else {
      status = 'INSUFFICIENT_INFO';
    }

    // Calculate weighted match score (0–100%)
    let totalWeight = 0;
    let earnedWeight = 0;
    for (const ev of evaluations) {
      const weight = ev.isMandatory !== false ? 1.0 : 0.5;
      totalWeight += weight;
      if (ev.isMet === true) {
        earnedWeight += weight;
      } else if (ev.isMet === null) {
        // partial potential weight for unconfirmed info
        earnedWeight += weight * 0.35;
      }
    }

    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    // Extract unique missing profile attributes
    const missingProfileFields = Array.from(
      new Set(evaluations.map((e) => e.missingData).filter(Boolean) as string[])
    );

    // Generate human-understandable summary
    const summaryText = this.generateSummaryText({
      status,
      score,
      scholarshipTitle: scholarship.title,
      mandatoryTotal,
      mandatorySatisfied,
      evaluations,
      missingProfileFields,
    });

    const summary: EligibilityEvaluationSummary = {
      totalCriteria: evaluations.length,
      satisfiedCount,
      failedCount,
      unconfirmedCount,
      mandatorySatisfied,
      mandatoryTotal,
      missingProfileFields,
      summary: summaryText,
    };

    const criteriaBreakdownPayload = {
      criteria: evaluations,
      summary,
    };

    // Upsert into EligibilityResult table
    const resultRecord = await this.prisma.eligibilityResult.upsert({
      where: {
        userId_scholarshipId: {
          userId,
          scholarshipId,
        },
      },
      create: {
        userId,
        scholarshipId,
        status,
        score,
        criteriaBreakdown: criteriaBreakdownPayload as any,
      },
      update: {
        status,
        score,
        criteriaBreakdown: criteriaBreakdownPayload as any,
        evaluatedAt: new Date(),
      },
    });

    return {
      id: resultRecord.id,
      userId: resultRecord.userId,
      scholarshipId: resultRecord.scholarshipId,
      status: resultRecord.status as EligibilityStatus,
      score: resultRecord.score,
      criteriaBreakdown: evaluations,
      summary,
      evaluatedAt: resultRecord.evaluatedAt.toISOString(),
    };
  }

  /**
   * Retrieves an existing eligibility result for a user and scholarship.
   */
  async getEligibilityResult(
    scholarshipId: string,
    userId: string
  ): Promise<EligibilityResultDTO | null> {
    const record = await this.prisma.eligibilityResult.findUnique({
      where: {
        userId_scholarshipId: {
          userId,
          scholarshipId,
        },
      },
    });

    if (!record) {
      return null;
    }

    const rawBreakdown = record.criteriaBreakdown as any;
    const criteria: EligibilityCriterionResult[] = Array.isArray(rawBreakdown)
      ? rawBreakdown
      : rawBreakdown?.criteria || [];
    const summary: EligibilityEvaluationSummary | undefined = rawBreakdown?.summary;

    return {
      id: record.id,
      userId: record.userId,
      scholarshipId: record.scholarshipId,
      status: record.status as EligibilityStatus,
      score: record.score,
      criteriaBreakdown: criteria,
      summary,
      evaluatedAt: record.evaluatedAt.toISOString(),
    };
  }

  /**
   * Evaluates a single requirement criterion against student profile data.
   */
  private evaluateCriterion(
    req: {
      id: string;
      category: RequirementCategory;
      operator: RequirementOperator;
      requiredValue: string;
      isMandatory: boolean;
      description?: string | null;
    },
    student: {
      profile: any;
      educationRecords: any[];
      languageSkills: any[];
      achievements: any[];
      experiences: any[];
    }
  ): EligibilityCriterionResult {
    switch (req.category) {
      case 'GPA':
        return this.evaluateGpa(req, student.educationRecords);

      case 'AGE':
        return this.evaluateAge(req, student.profile);

      case 'DEGREE_LEVEL':
        return this.evaluateDegreeLevel(req, student.educationRecords);

      case 'NATIONALITY':
        return this.evaluateNationality(req, student.profile);

      case 'LANGUAGE':
        return this.evaluateLanguage(req, student.languageSkills);

      case 'FIELD':
        return this.evaluateField(req, student.educationRecords);

      case 'FINANCIAL':
        return this.evaluateFinancial(req, student.profile);

      case 'OTHER':
      default:
        return this.evaluateOther(req, student.achievements, student.experiences);
    }
  }

  /**
   * GPA Evaluation
   */
  private evaluateGpa(
    req: { id: string; operator: RequirementOperator; requiredValue: string; isMandatory: boolean },
    educationRecords: any[]
  ): EligibilityCriterionResult {
    if (!educationRecords || educationRecords.length === 0) {
      return {
        requirementId: req.id,
        category: 'GPA',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: null,
        studentValue: null,
        missingData: 'EDUCATION_GPA',
        explanation: 'No education records or GPA found on your profile.',
      };
    }

    // Find highest normalized GPA
    let highestGpa: number | null = null;
    for (const record of educationRecords) {
      if (record.gpa != null) {
        let normalized = record.gpa;
        if (record.maxGpa && record.maxGpa > 0 && record.maxGpa !== 4.0) {
          normalized = (record.gpa / record.maxGpa) * 4.0;
        } else if (record.gpa > 4.0 && record.gpa <= 5.0) {
          normalized = (record.gpa / 5.0) * 4.0;
        }
        if (highestGpa === null || normalized > highestGpa) {
          highestGpa = normalized;
        }
      }
    }

    if (highestGpa === null) {
      return {
        requirementId: req.id,
        category: 'GPA',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: null,
        studentValue: null,
        missingData: 'EDUCATION_GPA',
        explanation: 'GPA is not recorded in your academic profile.',
      };
    }

    const roundedGpa = Math.round(highestGpa * 100) / 100;
    const targetGpa = parseFloat(req.requiredValue);

    if (isNaN(targetGpa)) {
      // Non-numeric required value (e.g. "First Class Honours")
      const meetsHonors = educationRecords.some(
        (r) =>
          r.honors?.toLowerCase().includes('first') ||
          r.honors?.toLowerCase().includes('distinction') ||
          (r.gpa && r.gpa >= 3.7)
      );
      return {
        requirementId: req.id,
        category: 'GPA',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: meetsHonors,
        studentValue: `${roundedGpa} / 4.0`,
        explanation: meetsHonors
          ? `Your academic standing (${roundedGpa}) fulfills the honors standard (${req.requiredValue}).`
          : `Your records do not confirm the required honors level (${req.requiredValue}).`,
      };
    }

    let isMet = false;
    if (req.operator === 'GTE') {
      isMet = roundedGpa >= targetGpa;
    } else if (req.operator === 'LTE') {
      isMet = roundedGpa <= targetGpa;
    } else {
      isMet = roundedGpa >= targetGpa;
    }

    return {
      requirementId: req.id,
      category: 'GPA',
      operator: req.operator,
      requiredValue: req.requiredValue,
      isMandatory: req.isMandatory,
      isMet,
      studentValue: `${roundedGpa} / 4.0`,
      explanation: isMet
        ? `Your GPA (${roundedGpa}) satisfies the required minimum of ${targetGpa}.`
        : `Your GPA (${roundedGpa}) is below the required benchmark of ${targetGpa}.`,
    };
  }

  /**
   * Age Evaluation
   */
  private evaluateAge(
    req: { id: string; operator: RequirementOperator; requiredValue: string; isMandatory: boolean },
    profile: any
  ): EligibilityCriterionResult {
    if (!profile || !profile.dateOfBirth) {
      return {
        requirementId: req.id,
        category: 'AGE',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: null,
        studentValue: null,
        missingData: 'DATE_OF_BIRTH',
        explanation: 'Date of birth is not specified on your profile.',
      };
    }

    const dob = new Date(profile.dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }

    const targetAge = parseInt(req.requiredValue, 10);
    if (isNaN(targetAge)) {
      return {
        requirementId: req.id,
        category: 'AGE',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: true,
        studentValue: `${age} years old`,
        explanation: `Age recorded as ${age}.`,
      };
    }

    let isMet = false;
    if (req.operator === 'LTE') {
      isMet = age <= targetAge;
    } else if (req.operator === 'GTE') {
      isMet = age >= targetAge;
    } else if (req.operator === 'EQ') {
      isMet = age === targetAge;
    } else {
      isMet = age <= targetAge;
    }

    return {
      requirementId: req.id,
      category: 'AGE',
      operator: req.operator,
      requiredValue: req.requiredValue,
      isMandatory: req.isMandatory,
      isMet,
      studentValue: `${age} years old`,
      explanation: isMet
        ? `Your age (${age}) meets the age criteria (${req.operator === 'LTE' ? 'max' : 'min'} ${targetAge}).`
        : `Your age (${age}) does not meet the requirement of ${req.operator} ${targetAge}.`,
    };
  }

  /**
   * Degree Level Evaluation
   */
  private evaluateDegreeLevel(
    req: { id: string; operator: RequirementOperator; requiredValue: string; isMandatory: boolean },
    educationRecords: any[]
  ): EligibilityCriterionResult {
    if (!educationRecords || educationRecords.length === 0) {
      return {
        requirementId: req.id,
        category: 'DEGREE_LEVEL',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: null,
        studentValue: null,
        missingData: 'EDUCATION_LEVEL',
        explanation: 'No education records found to verify degree level.',
      };
    }

    const normalizedReq = req.requiredValue.toUpperCase().trim();
    const requiredLevels = normalizedReq.split(/[,;\s/]+/).map((l) => l.trim());

    const studentLevels = educationRecords.map((r) => r.level as EducationLevel);
    const highestRank = Math.max(...studentLevels.map((l) => EDUCATION_LEVEL_RANKS[l] || 0));

    // Check direct equality or prerequisite fulfillment
    let isMet = false;
    for (const reqLevel of requiredLevels) {
      if (studentLevels.includes(reqLevel as EducationLevel)) {
        isMet = true;
        break;
      }
      // If applying for POSTGRADUATE scholarship, holding an UNDERGRADUATE degree qualifies
      if (
        (reqLevel === 'POSTGRADUATE' || reqLevel === 'MASTER' || reqLevel === 'MSC') &&
        studentLevels.includes('UNDERGRADUATE')
      ) {
        isMet = true;
        break;
      }
      // If applying for UNDERGRADUATE scholarship, holding a HIGH_SCHOOL credential qualifies
      if (
        reqLevel === 'UNDERGRADUATE' &&
        studentLevels.includes('HIGH_SCHOOL')
      ) {
        isMet = true;
        break;
      }
      // If holding DOCTORAL or POSTGRADUATE, higher rank qualifies
      const reqRank = EDUCATION_LEVEL_RANKS[reqLevel as EducationLevel];
      if (reqRank && highestRank >= reqRank) {
        isMet = true;
        break;
      }
    }

    return {
      requirementId: req.id,
      category: 'DEGREE_LEVEL',
      operator: req.operator,
      requiredValue: req.requiredValue,
      isMandatory: req.isMandatory,
      isMet,
      studentValue: studentLevels.join(', '),
      explanation: isMet
        ? `Your education credentials (${studentLevels.join(', ')}) fulfill the degree requirement (${req.requiredValue}).`
        : `Your education level (${studentLevels.join(', ')}) does not match the required level (${req.requiredValue}).`,
    };
  }

  /**
   * Nationality Evaluation
   */
  private evaluateNationality(
    req: { id: string; operator: RequirementOperator; requiredValue: string; isMandatory: boolean },
    profile: any
  ): EligibilityCriterionResult {
    if (!profile || !profile.nationality) {
      return {
        requirementId: req.id,
        category: 'NATIONALITY',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: null,
        studentValue: null,
        missingData: 'NATIONALITY',
        explanation: 'Citizenship/nationality is not set on your profile.',
      };
    }

    const studentNat = profile.nationality.trim().toUpperCase();
    const studentRes = (profile.residenceCountry || '').trim().toUpperCase();
    const reqVal = req.requiredValue.trim().toUpperCase();

    // Universal / Open International criteria
    if (
      reqVal === 'ALL' ||
      reqVal === 'ANY' ||
      reqVal === 'INTERNATIONAL' ||
      reqVal === 'GLOBAL'
    ) {
      return {
        requirementId: req.id,
        category: 'NATIONALITY',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: true,
        studentValue: profile.nationality,
        explanation: `Open to international candidates; qualified by citizenship (${profile.nationality}).`,
      };
    }

    // Non-UK requirement (e.g. Gates Cambridge, Clarendon non-UK pool)
    if (reqVal === 'NON_UK_INTERNATIONAL' || reqVal === 'NON_UK') {
      const isUk = COUNTRY_ALIASES.UK.includes(studentNat);
      return {
        requirementId: req.id,
        category: 'NATIONALITY',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: !isUk,
        studentValue: profile.nationality,
        explanation: !isUk
          ? `Qualified as a non-UK international applicant (${profile.nationality}).`
          : 'Ineligible: Scholarship is restricted to applicants from outside the United Kingdom.',
      };
    }

    // Developing Country / DAC list requirement (e.g. DAAD, Chevening Developing Nation stream)
    if (
      reqVal === 'DEVELOPING_COUNTRIES' ||
      reqVal === 'DEVELOPING' ||
      reqVal === 'DAC'
    ) {
      const isDeveloped = DEVELOPED_ECONOMIES.has(studentNat);
      return {
        requirementId: req.id,
        category: 'NATIONALITY',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: !isDeveloped,
        studentValue: profile.nationality,
        explanation: !isDeveloped
          ? `Your citizenship (${profile.nationality}) qualifies under eligible developing country criteria.`
          : `Citizens of ${profile.nationality} are not eligible under developing economy restrictions.`,
      };
    }

    // Specific country / ISO list matching
    const allowedTokens = reqVal.split(/[,;\s/]+/).map((t) => t.trim());
    let isMet = false;

    for (const token of allowedTokens) {
      if (token === studentNat || token === studentRes) {
        isMet = true;
        break;
      }
      // Check alias list
      const aliases = COUNTRY_ALIASES[token];
      if (aliases && (aliases.includes(studentNat) || aliases.includes(studentRes))) {
        isMet = true;
        break;
      }
    }

    return {
      requirementId: req.id,
      category: 'NATIONALITY',
      operator: req.operator,
      requiredValue: req.requiredValue,
      isMandatory: req.isMandatory,
      isMet,
      studentValue: profile.nationality,
      explanation: isMet
        ? `Your nationality (${profile.nationality}) is eligible for this scholarship.`
        : `Your nationality (${profile.nationality}) is not on the list of eligible countries (${req.requiredValue}).`,
    };
  }

  /**
   * Language Evaluation
   */
  private evaluateLanguage(
    req: { id: string; operator: RequirementOperator; requiredValue: string; isMandatory: boolean },
    languageSkills: any[]
  ): EligibilityCriterionResult {
    const reqVal = req.requiredValue.toUpperCase().trim();
    const missingField = reqVal.includes('IELTS')
      ? 'IELTS_TEST_SCORE'
      : reqVal.includes('TOEFL')
      ? 'TOEFL_TEST_SCORE'
      : 'LANGUAGE_PROFICIENCY';

    if (!languageSkills || languageSkills.length === 0) {
      return {
        requirementId: req.id,
        category: 'LANGUAGE',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: null,
        studentValue: null,
        missingData: missingField,
        explanation: `No language proficiency or test score found on your profile (requires ${req.requiredValue}).`,
      };
    }

    // Check if student is native speaker of English
    const nativeEnglish = languageSkills.find(
      (s) => s.isNative && s.language.toLowerCase().includes('english')
    );
    if (nativeEnglish) {
      return {
        requirementId: req.id,
        category: 'LANGUAGE',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: true,
        studentValue: 'Native English Speaker',
        explanation: 'Fulfills language requirements as a native speaker.',
      };
    }

    // Check IELTS benchmark (e.g. "IELTS:7.5", "IELTS:7.0", "7.0")
    if (reqVal.includes('IELTS')) {
      const match = reqVal.match(/(\d+(\.\d+)?)/);
      const benchmark = match ? parseFloat(match[1]) : 7.0;

      const ieltsSkill = languageSkills.find(
        (s) => s.testType === 'IELTS' || s.language.toLowerCase().includes('english')
      );

      if (!ieltsSkill || !ieltsSkill.testScore) {
        return {
          requirementId: req.id,
          category: 'LANGUAGE',
          operator: req.operator,
          requiredValue: req.requiredValue,
          isMandatory: req.isMandatory,
          isMet: null,
          studentValue: null,
          missingData: 'IELTS_TEST_SCORE',
          explanation: `Requires IELTS benchmark of ${benchmark}. No verified test score on record.`,
        };
      }

      const studentScore = parseFloat(ieltsSkill.testScore);
      const isMet = !isNaN(studentScore) && studentScore >= benchmark;

      return {
        requirementId: req.id,
        category: 'LANGUAGE',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet,
        studentValue: `IELTS ${ieltsSkill.testScore}`,
        explanation: isMet
          ? `Your IELTS score (${studentScore}) satisfies the minimum requirement of ${benchmark}.`
          : `Your IELTS score (${studentScore}) is below the required benchmark of ${benchmark}.`,
      };
    }

    // Check TOEFL benchmark (e.g. "TOEFL:100", "TOEFL:90")
    if (reqVal.includes('TOEFL')) {
      const match = reqVal.match(/(\d+)/);
      const benchmark = match ? parseInt(match[1], 10) : 90;

      const toeflSkill = languageSkills.find((s) => s.testType === 'TOEFL');
      if (!toeflSkill || !toeflSkill.testScore) {
        return {
          requirementId: req.id,
          category: 'LANGUAGE',
          operator: req.operator,
          requiredValue: req.requiredValue,
          isMandatory: req.isMandatory,
          isMet: null,
          studentValue: null,
          missingData: 'TOEFL_TEST_SCORE',
          explanation: `Requires TOEFL score of at least ${benchmark}. No test score on record.`,
        };
      }

      const studentScore = parseInt(toeflSkill.testScore, 10);
      const isMet = !isNaN(studentScore) && studentScore >= benchmark;

      return {
        requirementId: req.id,
        category: 'LANGUAGE',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet,
        studentValue: `TOEFL ${toeflSkill.testScore}`,
        explanation: isMet
          ? `Your TOEFL score (${studentScore}) satisfies the required ${benchmark}.`
          : `Your TOEFL score (${studentScore}) is below the required ${benchmark}.`,
      };
    }

    // Check CEFR benchmark (e.g. "B2", "C1", "C2")
    const englishSkill = languageSkills.find((s) =>
      s.language.toLowerCase().includes('english')
    );
    if (englishSkill && englishSkill.proficiencyLevel) {
      const prof = englishSkill.proficiencyLevel.toUpperCase();
      const cefrOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE'];
      const targetRank = cefrOrder.findIndex((l) => reqVal.includes(l));
      const studentRank = cefrOrder.findIndex((l) => prof.includes(l));

      if (targetRank !== -1 && studentRank !== -1) {
        const isMet = studentRank >= targetRank;
        return {
          requirementId: req.id,
          category: 'LANGUAGE',
          operator: req.operator,
          requiredValue: req.requiredValue,
          isMandatory: req.isMandatory,
          isMet,
          studentValue: englishSkill.proficiencyLevel,
          explanation: isMet
            ? `Your proficiency (${englishSkill.proficiencyLevel}) meets or exceeds ${req.requiredValue}.`
            : `Your proficiency (${englishSkill.proficiencyLevel}) does not meet ${req.requiredValue}.`,
        };
      }
    }

    return {
      requirementId: req.id,
      category: 'LANGUAGE',
      operator: req.operator,
      requiredValue: req.requiredValue,
      isMandatory: req.isMandatory,
      isMet: true,
      studentValue: englishSkill ? englishSkill.language : 'English Skill',
      explanation: 'Language requirement evaluated against documented language competencies.',
    };
  }

  /**
   * Field of Study Evaluation
   */
  private evaluateField(
    req: { id: string; operator: RequirementOperator; requiredValue: string; isMandatory: boolean },
    educationRecords: any[]
  ): EligibilityCriterionResult {
    const reqVal = req.requiredValue.toUpperCase().trim();
    if (reqVal === 'ALL' || reqVal === 'ANY' || reqVal === 'OPEN') {
      return {
        requirementId: req.id,
        category: 'FIELD',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: true,
        studentValue: 'All Fields Accepted',
        explanation: 'All academic majors and fields are eligible.',
      };
    }

    if (!educationRecords || educationRecords.length === 0) {
      return {
        requirementId: req.id,
        category: 'FIELD',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: null,
        studentValue: null,
        missingData: 'EDUCATION_FIELD',
        explanation: 'No major or field of study specified on your profile.',
      };
    }

    const studentFields = educationRecords
      .map((r) => `${r.fieldOfStudy} ${r.faculty || ''} ${r.degree || ''}`)
      .join(' ')
      .toUpperCase();

    const allowedKeywords = reqVal.split(/[,;\s/]+/).map((k) => k.trim());
    const isMet = allowedKeywords.some(
      (keyword) => keyword.length > 2 && studentFields.includes(keyword)
    );

    const primaryField = educationRecords[0].fieldOfStudy;

    return {
      requirementId: req.id,
      category: 'FIELD',
      operator: req.operator,
      requiredValue: req.requiredValue,
      isMandatory: req.isMandatory,
      isMet,
      studentValue: primaryField,
      explanation: isMet
        ? `Your field of study (${primaryField}) is compatible with eligible academic fields.`
        : `Your field of study (${primaryField}) does not match the designated disciplines (${req.requiredValue}).`,
    };
  }

  /**
   * Financial Need Evaluation
   */
  private evaluateFinancial(
    req: { id: string; operator: RequirementOperator; requiredValue: string; isMandatory: boolean },
    profile: any
  ): EligibilityCriterionResult {
    if (profile?.familyIncomeTier || profile?.financialStatement) {
      return {
        requirementId: req.id,
        category: 'FINANCIAL',
        operator: req.operator,
        requiredValue: req.requiredValue,
        isMandatory: req.isMandatory,
        isMet: true,
        studentValue: profile.familyIncomeTier || 'Statement Provided',
        explanation: 'Financial background information is documented in your profile.',
      };
    }

    return {
      requirementId: req.id,
      category: 'FINANCIAL',
      operator: req.operator,
      requiredValue: req.requiredValue,
      isMandatory: req.isMandatory,
      isMet: null,
      studentValue: null,
      missingData: 'FINANCIAL_STATEMENT',
      explanation: 'Financial income statement or tier is missing from your profile.',
    };
  }

  /**
   * Other Requirements (Leadership, Community Service, etc.)
   */
  private evaluateOther(
    req: { id: string; operator: RequirementOperator; requiredValue: string; isMandatory: boolean; description?: string | null },
    achievements: any[],
    experiences: any[]
  ): EligibilityCriterionResult {
    const hasActivities = achievements.length > 0 || experiences.length > 0;
    return {
      requirementId: req.id,
      category: 'OTHER',
      operator: req.operator,
      requiredValue: req.requiredValue,
      isMandatory: req.isMandatory,
      isMet: hasActivities ? true : null,
      studentValue: hasActivities ? `${experiences.length} Experiences / ${achievements.length} Achievements` : null,
      missingData: hasActivities ? undefined : 'EXPERIENCES_OR_ACTIVITIES',
      explanation: hasActivities
        ? 'Prerequisite evaluated against recorded experiences and achievements.'
        : `Review condition: ${req.description || req.requiredValue}`,
    };
  }

  /**
   * Generates a clear, human-understandable summary explanation.
   */
  private generateSummaryText(params: {
    status: EligibilityStatus;
    score: number;
    scholarshipTitle: string;
    mandatoryTotal: number;
    mandatorySatisfied: number;
    evaluations: EligibilityCriterionResult[];
    missingProfileFields: string[];
  }): string {
    const { status, score, scholarshipTitle, mandatoryTotal, mandatorySatisfied, evaluations, missingProfileFields } = params;

    if (status === 'ELIGIBLE') {
      return `Congratulations! You meet all ${mandatoryTotal} mandatory eligibility criteria for "${scholarshipTitle}" with an estimated match score of ${score}%.`;
    }

    if (status === 'INELIGIBLE') {
      const failed = evaluations.filter((e) => e.isMet === false && e.isMandatory !== false);
      const failedReasons = failed.map((f) => f.category).join(', ');
      return `You do not currently meet the mandatory requirements for "${scholarshipTitle}". Unfulfilled criteria: ${failedReasons || 'Academic benchmarks'}. Match score: ${score}%.`;
    }

    return `Unable to verify full eligibility for "${scholarshipTitle}". ${mandatorySatisfied} of ${mandatoryTotal} mandatory criteria are confirmed. Please update missing profile fields (${missingProfileFields.join(', ')}) to complete your evaluation.`;
  }
}
