import { z } from 'zod';
import { PrismaClient, MappingSourceType, MissingInfoCategory } from '@scholaris/database';
import { AppError, NotFoundError, ForbiddenError } from '@scholaris/shared';
import { FieldMatchingSummary } from '@scholaris/types';
import { AIAuditService } from '../ai/ai-audit.service.js';

// Output schema for AI Semantic Field Matching
export const aiFieldMatchItemSchema = z.object({
  fieldKey: z.string(),
  matchedValue: z.string().nullable(),
  sourceType: z.enum(['PROFILE', 'DOCUMENT', 'USER_INPUT', 'AI_DRAFT']),
  sourcePath: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  isMissing: z.boolean(),
  missingCategory: z.enum(['FIELD_VALUE', 'DOCUMENT_UPLOAD', 'ESSAY_RESPONSE']).optional(),
  missingPrompt: z.string().optional(),
});

export const aiFieldMatchOutputSchema = z.object({
  matches: z.array(aiFieldMatchItemSchema),
  matchingNotes: z.string().optional(),
});

export type AIFieldMatchOutput = z.infer<typeof aiFieldMatchOutputSchema>;

export class FieldMatcherService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiAuditService: AIAuditService
  ) {}

  /**
   * Performs semantic field matching between discovered scholarship application fields
   * and student profile data & uploaded document vault items.
   *
   * Anti-hallucination invariant: Never fabricates personal facts; unconfirmed or missing
   * fields are flagged as MissingInformation for student review.
   */
  async matchApplicationFields(
    applicationId: string,
    userId: string
  ): Promise<FieldMatchingSummary> {
    // 1. Fetch application with scholarship and existing application fields
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        scholarship: true,
        fields: {
          orderBy: [{ pageNumber: 'asc' }, { fieldKey: 'asc' }],
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this application');
    }

    // Safety rule: Block field matching on SUSPICIOUS scholarships
    if (application.scholarship.verificationStatus === 'SUSPICIOUS') {
      throw new AppError(
        'Cannot perform field matching for a scholarship flagged as SUSPICIOUS. Processing is blocked for security.',
        400,
        'SCHOLARSHIP_SUSPICIOUS'
      );
    }

    // 2. Retrieve student complete profile and document vault
    const [profile, educationRecords, languageSkills, achievements, experiences, documents] =
      await Promise.all([
        this.prisma.userProfile.findUnique({ where: { userId } }),
        this.prisma.educationRecord.findMany({
          where: { userId },
          orderBy: [{ isCurrent: 'desc' }, { endDate: 'desc' }],
        }),
        this.prisma.languageSkill.findMany({ where: { userId } }),
        this.prisma.achievement.findMany({ where: { userId } }),
        this.prisma.experience.findMany({
          where: { userId },
          orderBy: [{ isCurrent: 'desc' }, { endDate: 'desc' }],
        }),
        this.prisma.document.findMany({ where: { userId } }),
      ]);

    const latestEdu = educationRecords[0] || null;
    const fields = application.fields;

    if (fields.length === 0) {
      return {
        applicationId,
        totalFieldsCount: 0,
        matchedFieldsCount: 0,
        missingFieldsCount: 0,
        confidenceAverage: 0,
        mappings: [],
        missingInformation: [],
        status: application.status,
      };
    }

    // 3. Rule-Based Pre-Matching (Deterministic standard attributes)
    const preliminaryMatches = new Map<
      string,
      {
        fieldId: string;
        mappedValue: string | null;
        sourceType: MappingSourceType;
        sourcePath: string | null;
        confidence: number;
        isMissing: boolean;
        missingCategory?: MissingInfoCategory;
        missingPrompt?: string;
      }
    >();

    const fieldsNeedingAI: typeof fields = [];

    for (const field of fields) {
      const key = field.fieldKey.toLowerCase();
      const label = field.label.toLowerCase();
      const options = Array.isArray(field.options) ? (field.options as string[]) : [];

      let matched = false;

      // Full Name
      if (
        (key.includes('full_name') || label.includes('full name') || key === 'name') &&
        profile?.fullName
      ) {
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: profile.fullName,
          sourceType: 'PROFILE',
          sourcePath: 'profile.fullName',
          confidence: 0.99,
          isMissing: false,
        });
        matched = true;
      }
      // First / Given Name
      else if (
        (key.includes('first_name') || key.includes('given_name') || label.includes('first name') || label.includes('given name')) &&
        profile?.firstName
      ) {
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: profile.firstName,
          sourceType: 'PROFILE',
          sourcePath: 'profile.firstName',
          confidence: 0.99,
          isMissing: false,
        });
        matched = true;
      }
      // Last / Family Name / Surname
      else if (
        (key.includes('last_name') || key.includes('surname') || key.includes('family_name') || label.includes('last name') || label.includes('surname')) &&
        profile?.lastName
      ) {
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: profile.lastName,
          sourceType: 'PROFILE',
          sourcePath: 'profile.lastName',
          confidence: 0.99,
          isMissing: false,
        });
        matched = true;
      }
      // Date of Birth
      else if (
        (key.includes('dob') || key.includes('birth') || label.includes('date of birth') || label.includes('birth date')) &&
        profile?.dateOfBirth
      ) {
        const dobStr = profile.dateOfBirth.toISOString().split('T')[0];
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: dobStr,
          sourceType: 'PROFILE',
          sourcePath: 'profile.dateOfBirth',
          confidence: 0.98,
          isMissing: false,
        });
        matched = true;
      }
      // Gender / Sex
      else if (
        (key.includes('gender') || key.includes('sex') || label.includes('gender')) &&
        profile?.gender
      ) {
        let genderVal: string = profile.gender;
        if (options.length > 0) {
          const matchOpt = options.find((opt) => opt.toUpperCase().includes(profile.gender || ''));
          if (matchOpt) genderVal = matchOpt;
        }
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: genderVal,
          sourceType: 'PROFILE',
          sourcePath: 'profile.gender',
          confidence: 0.95,
          isMissing: false,
        });
        matched = true;
      }
      // Nationality / Citizenship
      else if (
        (key.includes('nationality') || key.includes('citizenship') || label.includes('nationality') || label.includes('citizenship')) &&
        profile?.nationality
      ) {
        let natVal = profile.nationality;
        if (options.length > 0) {
          const matchOpt = options.find((opt) => opt.toLowerCase().includes(profile.nationality.toLowerCase()));
          if (matchOpt) natVal = matchOpt;
        }
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: natVal,
          sourceType: 'PROFILE',
          sourcePath: 'profile.nationality',
          confidence: 0.95,
          isMissing: false,
        });
        matched = true;
      }
      // Country of Residence
      else if (
        (key.includes('residence') || key.includes('country') || label.includes('country of residence')) &&
        profile?.residenceCountry
      ) {
        let countryVal = profile.residenceCountry;
        if (options.length > 0) {
          const matchOpt = options.find((opt) => opt.toLowerCase().includes(profile.residenceCountry.toLowerCase()));
          if (matchOpt) countryVal = matchOpt;
        }
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: countryVal,
          sourceType: 'PROFILE',
          sourcePath: 'profile.residenceCountry',
          confidence: 0.95,
          isMissing: false,
        });
        matched = true;
      }
      // Phone
      else if ((key.includes('phone') || key.includes('mobile') || label.includes('phone number')) && profile?.phone) {
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: profile.phone,
          sourceType: 'PROFILE',
          sourcePath: 'profile.phone',
          confidence: 0.95,
          isMissing: false,
        });
        matched = true;
      }
      // GPA
      else if (
        (key.includes('gpa') || key.includes('grade_point') || label.includes('gpa') || label.includes('grade point')) &&
        latestEdu?.gpa !== null && latestEdu?.gpa !== undefined
      ) {
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: String(latestEdu.gpa),
          sourceType: 'PROFILE',
          sourcePath: 'education[0].gpa',
          confidence: 0.95,
          isMissing: false,
        });
        matched = true;
      }
      // Major / Field of Study
      else if (
        (key.includes('major') || key.includes('field_of_study') || label.includes('major') || label.includes('field of study')) &&
        latestEdu?.fieldOfStudy
      ) {
        let fieldVal = latestEdu.fieldOfStudy;
        if (options.length > 0) {
          const matchOpt = options.find((opt) => opt.toLowerCase().includes(latestEdu.fieldOfStudy.toLowerCase()));
          if (matchOpt) fieldVal = matchOpt;
        }
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: fieldVal,
          sourceType: 'PROFILE',
          sourcePath: 'education[0].fieldOfStudy',
          confidence: 0.95,
          isMissing: false,
        });
        matched = true;
      }
      // Institution / University
      else if (
        (key.includes('institution') || key.includes('university') || key.includes('college') || label.includes('university') || label.includes('institution')) &&
        latestEdu?.institution
      ) {
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: latestEdu.institution,
          sourceType: 'PROFILE',
          sourcePath: 'education[0].institution',
          confidence: 0.95,
          isMissing: false,
        });
        matched = true;
      }
      // Degree Level
      else if (
        (key.includes('degree') || label.includes('degree')) &&
        latestEdu?.degree
      ) {
        let degVal = latestEdu.degree;
        if (options.length > 0) {
          const matchOpt = options.find((opt) => opt.toLowerCase().includes(latestEdu.degree?.toLowerCase() || ''));
          if (matchOpt) degVal = matchOpt;
        }
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: degVal,
          sourceType: 'PROFILE',
          sourcePath: 'education[0].degree',
          confidence: 0.92,
          isMissing: false,
        });
        matched = true;
      }
      // File Uploads (Transcript, CV, Passport)
      else if (field.fieldType === 'FILE') {
        let docCategory: string | null = null;
        if (key.includes('transcript') || label.includes('transcript')) docCategory = 'TRANSCRIPT';
        else if (key.includes('cv') || key.includes('resume') || label.includes('cv') || label.includes('resume')) docCategory = 'CV';
        else if (key.includes('passport') || label.includes('passport')) docCategory = 'PASSPORT';
        else if (key.includes('recommendation') || label.includes('recommendation') || label.includes('reference')) docCategory = 'RECOMMENDATION';
        else if (key.includes('motivation') || label.includes('motivation') || label.includes('statement')) docCategory = 'MOTIVATION_LETTER';

        const matchingDoc = docCategory ? documents.find((d) => d.category === docCategory) : documents[0] || null;

        if (matchingDoc) {
          preliminaryMatches.set(field.id, {
            fieldId: field.id,
            mappedValue: matchingDoc.id,
            sourceType: 'DOCUMENT',
            sourcePath: `documents[category=${matchingDoc.category}].id`,
            confidence: 0.92,
            isMissing: false,
          });
          matched = true;
        } else {
          // Mandatory or optional file missing
          preliminaryMatches.set(field.id, {
            fieldId: field.id,
            mappedValue: null,
            sourceType: 'DOCUMENT',
            sourcePath: null,
            confidence: 0.0,
            isMissing: true,
            missingCategory: 'DOCUMENT_UPLOAD',
            missingPrompt: `Please upload your ${field.label} (${docCategory || 'Document'}) in the Document Vault.`,
          });
          matched = true;
        }
      }
      // Lengthy Essay / Personal Statement
      else if (
        field.fieldType === 'TEXTAREA' ||
        key.includes('essay') ||
        label.includes('essay') ||
        key.includes('statement') ||
        label.includes('statement') ||
        label.includes('motivation')
      ) {
        preliminaryMatches.set(field.id, {
          fieldId: field.id,
          mappedValue: null,
          sourceType: 'AI_DRAFT',
          sourcePath: null,
          confidence: 0.0,
          isMissing: true,
          missingCategory: 'ESSAY_RESPONSE',
          missingPrompt: `A personal statement or essay response is required for "${field.label}".`,
        });
        matched = true;
      }

      if (!matched) {
        fieldsNeedingAI.push(field);
      }
    }

    // 4. AI Semantic Field Matching (for nuanced, unmapped, or complex dropdown fields)
    if (fieldsNeedingAI.length > 0) {
      const studentProfileSummary = {
        name: profile?.fullName,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        dateOfBirth: profile?.dateOfBirth?.toISOString().split('T')[0],
        gender: profile?.gender,
        nationality: profile?.nationality,
        residenceCountry: profile?.residenceCountry,
        city: profile?.city,
        address: profile?.address,
        phone: profile?.phone,
        altEmail: profile?.altEmail,
        education: educationRecords.map((e) => ({
          level: e.level,
          institution: e.institution,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          gpa: e.gpa,
          maxGpa: e.maxGpa,
          honors: e.honors,
          isCurrent: e.isCurrent,
        })),
        languages: languageSkills.map((l) => ({
          language: l.language,
          isNative: l.isNative,
          proficiencyLevel: l.proficiencyLevel,
          testType: l.testType,
          testScore: l.testScore,
        })),
        achievements: achievements.map((a) => a.title),
        experiences: experiences.map((e) => ({
          role: e.roleTitle,
          organization: e.organization,
          type: e.type,
        })),
        documents: documents.map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
        })),
      };

      const fieldsForPrompt = fieldsNeedingAI.map((f) => ({
        fieldKey: f.fieldKey,
        label: f.label,
        fieldType: f.fieldType,
        options: f.options,
        isRequired: f.isRequired,
      }));

      const prompt = `You are the lead Admissions Schema Matching Engine for Scholaris.
Match the scholarship form fields to the student's verified profile data and uploaded documents.

STUDENT PROFILE DATA:
${JSON.stringify(studentProfileSummary, null, 2)}

FORM FIELDS TO MATCH:
${JSON.stringify(fieldsForPrompt, null, 2)}

MATCHING & ANTI-HALLUCINATION RULES:
1. For each field, determine if the student profile or documents contain the exact or logically corresponding value.
2. If the field has "options" (dropdown or radio choices), the mappedValue MUST exactly match one of the provided option strings.
3. ANTI-HALLUCINATION INVARIANT: Never fabricate or guess personal facts, test scores, grades, dates, or identities.
   - If the student profile DOES NOT contain the answer, set "mappedValue": null, "confidence": 0.0, and "isMissing": true.
   - Provide a clear "missingPrompt" explaining what information is missing.
   - Set "missingCategory" to "FIELD_VALUE", "DOCUMENT_UPLOAD", or "ESSAY_RESPONSE".
4. When a match is found:
   - Provide the exact "matchedValue".
   - Set "sourceType" to "PROFILE" or "DOCUMENT".
   - Specify "sourcePath" (e.g. "education[0].fieldOfStudy", "profile.city").
   - Assign a realistic "confidence" score between 0.60 and 0.99 based on match certainty.

Respond strictly with a JSON object adhering to the specified schema.`;

      try {
        const aiResult = await this.aiAuditService.executeStructuredWithAudit<AIFieldMatchOutput>({
          userId,
          taskType: 'MATCHING',
          prompt,
          systemPrompt:
            'You are an expert scholarship application schema matcher. Match form fields accurately without ever hallucinating missing student details.',
          schema: aiFieldMatchOutputSchema,
          anonymize: true,
          temperature: 0.1,
        });

        const fieldKeyMap = new Map(fieldsNeedingAI.map((f) => [f.fieldKey, f]));

        for (const item of aiResult.data.matches) {
          const field = fieldKeyMap.get(item.fieldKey);
          if (!field) continue;

          preliminaryMatches.set(field.id, {
            fieldId: field.id,
            mappedValue: item.matchedValue,
            sourceType: item.sourceType as MappingSourceType,
            sourcePath: item.sourcePath,
            confidence: item.confidence,
            isMissing: item.isMissing || !item.matchedValue || item.confidence < 0.6,
            missingCategory: item.missingCategory as MissingInfoCategory,
            missingPrompt: item.missingPrompt,
          });
        }
      } catch (err: any) {
        console.warn(`AI field matching fallback invoked: ${err.message}`);
        // Fallback: flag unmatched fields safely
        for (const field of fieldsNeedingAI) {
          preliminaryMatches.set(field.id, {
            fieldId: field.id,
            mappedValue: null,
            sourceType: 'USER_INPUT',
            sourcePath: null,
            confidence: 0.0,
            isMissing: true,
            missingCategory: 'FIELD_VALUE',
            missingPrompt: `Please provide value for ${field.label}.`,
          });
        }
      }
    }

    // 5. Consolidate Mappings and Missing Information Records
    const mappingsToCreate: {
      applicationId: string;
      fieldId: string;
      mappedValue: string;
      sourceType: MappingSourceType;
      sourcePath: string | null;
      confidence: number;
    }[] = [];

    const missingInfoToCreate: {
      applicationId: string;
      fieldId: string;
      prompt: string;
      category: MissingInfoCategory;
    }[] = [];

    for (const field of fields) {
      const match = preliminaryMatches.get(field.id);
      const isMissing = !match || match.isMissing || !match.mappedValue || match.confidence < 0.6;

      if (!isMissing && match.mappedValue) {
        mappingsToCreate.push({
          applicationId,
          fieldId: field.id,
          mappedValue: match.mappedValue,
          sourceType: match.sourceType,
          sourcePath: match.sourcePath,
          confidence: match.confidence,
        });
      } else {
        // Only mandatory fields generate blocking MissingInformation records
        if (field.isRequired) {
          const category: MissingInfoCategory =
            match?.missingCategory ||
            (field.fieldType === 'FILE'
              ? 'DOCUMENT_UPLOAD'
              : field.fieldType === 'TEXTAREA'
              ? 'ESSAY_RESPONSE'
              : 'FIELD_VALUE');

          const prompt =
            match?.missingPrompt ||
            (category === 'DOCUMENT_UPLOAD'
              ? `Please upload your ${field.label} in the Document Vault.`
              : category === 'ESSAY_RESPONSE'
              ? `Please write or edit your response for "${field.label}".`
              : `Please provide your ${field.label}.`);

          missingInfoToCreate.push({
            applicationId,
            fieldId: field.id,
            prompt,
            category,
          });
        }

        // Even unmapped fields get a baseline mapping row with confidence 0.0 for review
        mappingsToCreate.push({
          applicationId,
          fieldId: field.id,
          mappedValue: match?.mappedValue || '',
          sourceType: match?.sourceType || 'USER_INPUT',
          sourcePath: match?.sourcePath || null,
          confidence: match ? match.confidence : 0.0,
        });
      }
    }

    // 6. Transactionally persist mappings and update application status
    const newStatus = missingInfoToCreate.length > 0 ? 'WAITING_FOR_INPUT' : 'READY_FOR_REVIEW';

    const { createdMappings, createdMissingInfo } = await this.prisma.$transaction(async (tx) => {
      // Clear previous mappings and missing info for this application
      await tx.fieldMapping.deleteMany({ where: { applicationId } });
      await tx.missingInformation.deleteMany({ where: { applicationId } });

      // Insert mappings
      const createdMappings = await Promise.all(
        mappingsToCreate.map((m) =>
          tx.fieldMapping.create({
            data: m,
          })
        )
      );

      // Insert missing info
      const createdMissingInfo = await Promise.all(
        missingInfoToCreate.map((mi) =>
          tx.missingInformation.create({
            data: mi,
          })
        )
      );

      // Update Application status
      await tx.application.update({
        where: { id: applicationId },
        data: { status: newStatus },
      });

      return { createdMappings, createdMissingInfo };
    });

    // 7. Calculate summary metrics
    const matchedCount = createdMappings.filter((m) => m.confidence >= 0.6 && m.mappedValue.length > 0).length;
    const avgConfidence =
      createdMappings.length > 0
        ? createdMappings.reduce((sum, m) => sum + m.confidence, 0) / createdMappings.length
        : 0;

    return {
      applicationId,
      totalFieldsCount: fields.length,
      matchedFieldsCount: matchedCount,
      missingFieldsCount: createdMissingInfo.length,
      confidenceAverage: Math.round(avgConfidence * 100) / 100,
      mappings: createdMappings.map((m) => ({
        id: m.id,
        applicationId: m.applicationId,
        fieldId: m.fieldId,
        mappedValue: m.mappedValue,
        sourceType: m.sourceType,
        sourcePath: m.sourcePath,
        confidence: m.confidence,
        isEditedByUser: m.isEditedByUser,
      })),
      missingInformation: createdMissingInfo.map((mi) => ({
        id: mi.id,
        applicationId: mi.applicationId,
        fieldId: mi.fieldId,
        prompt: mi.prompt,
        category: mi.category,
        isResolved: mi.isResolved,
        userResponse: mi.userResponse,
      })),
      status: newStatus,
    };
  }
}
