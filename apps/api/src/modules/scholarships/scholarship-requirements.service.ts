import { z } from 'zod';
import {
  PrismaClient,
  RequirementCategory,
  RequirementOperator,
} from '@scholaris/database';
import { CreateRequirementInput } from '@scholaris/validation';
import { AIAuditService } from '../ai/ai-audit.service.js';
import { ScholarshipFetcherService } from './scholarship-fetcher.service.js';
import { AppError } from '@scholaris/shared';

// Zod Schema for AI Extraction Output
export const extractedRequirementItemSchema = z.object({
  category: z.enum([
    'NATIONALITY',
    'AGE',
    'GPA',
    'DEGREE_LEVEL',
    'LANGUAGE',
    'FIELD',
    'FINANCIAL',
    'OTHER',
  ]),
  operator: z.enum(['EQ', 'GTE', 'LTE', 'IN']),
  requiredValue: z.string().min(1).max(255),
  isMandatory: z.boolean(),
  description: z.string().min(1).max(500),
});

export const extractedRequirementsOutputSchema = z.object({
  requirements: z.array(extractedRequirementItemSchema),
  extractionSummary: z.string().min(1),
  detectedEligibleTarget: z.string().optional(),
});

export type ExtractedRequirementItem = z.infer<
  typeof extractedRequirementItemSchema
>;

export type ExtractedRequirementsOutput = z.infer<
  typeof extractedRequirementsOutputSchema
>;

export interface ExtractionResult {
  scholarshipId: string;
  requirements: any[];
  extractionSummary: string;
  totalCount: number;
  mandatoryCount: number;
  preferredCount: number;
  aiMetrics: {
    model: string;
    latencyMs: number;
    tokensUsed: number;
    costUSD?: number;
  };
}

export class ScholarshipRequirementsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiAuditService: AIAuditService,
    private readonly fetcher: ScholarshipFetcherService = new ScholarshipFetcherService()
  ) {}

  /**
   * Extracts structured eligibility requirements from scholarship webpage content.
   * Normalizes GPA, age, nationality, language, degree levels, and fields into queryable criteria.
   */
  async extractRequirements(
    scholarshipId: string,
    userId?: string
  ): Promise<ExtractionResult> {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: scholarshipId },
      include: { requirements: true },
    });

    if (!scholarship) {
      throw new AppError(`Scholarship with ID '${scholarshipId}' not found`, 404, 'NOT_FOUND');
    }

    // Safety rule: Block requirement extraction on SUSPICIOUS scholarships
    if (scholarship.verificationStatus === 'SUSPICIOUS') {
      throw new AppError(
        'Cannot extract requirements from a scholarship flagged as SUSPICIOUS. Automated processing is blocked for security.',
        400,
        'SCHOLARSHIP_SUSPICIOUS'
      );
    }

    // Retrieve or fetch webpage text content
    let contentSnippet = scholarship.verificationSummary || '';
    if (!contentSnippet || contentSnippet.length < 50) {
      try {
        const fetched = await this.fetcher.fetchSafeContent(scholarship.websiteUrl);
        contentSnippet = fetched.cleanText;
      } catch (err: any) {
        contentSnippet = `Title: ${scholarship.title}. Provider: ${scholarship.providerName}. URL: ${scholarship.websiteUrl}`;
      }
    }

    // Construct high-precision extraction prompt
    const prompt = `You are the lead Academic Eligibility and Admissions Requirements Parser for Scholaris.
Extract all formal criteria and eligibility conditions for the following scholarship into structured, normalized criteria.

SCHOLARSHIP DETAILS:
- Title: ${scholarship.title}
- Provider: ${scholarship.providerName}
- Website URL: ${scholarship.websiteUrl}

WEBPAGE CONTENT:
"""
${contentSnippet.slice(0, 4500)}
"""

EXTRACTION RULES:
1. Identify all discrete eligibility prerequisites and assign them one of the following categories:
   - GPA: Minimum GPA, academic standing, or degree classification (e.g. "3.5", "First Class Honours"). Operator: GTE.
   - AGE: Maximum or minimum age limits (e.g. "30"). Operator: LTE for maximum age, GTE for minimum age.
   - DEGREE_LEVEL: Required degree level sought or held (HIGH_SCHOOL, UNDERGRADUATE, POSTGRADUATE, DOCTORAL). Operator: EQ or IN.
   - NATIONALITY: Citizenship or residency conditions (e.g. "INTERNATIONAL", "DEVELOPING_COUNTRIES", or ISO country codes like "ET,KE,NG"). Operator: IN or EQ.
   - LANGUAGE: English or foreign language test benchmarks (e.g. "IELTS:7.5", "TOEFL:100", "CEFR:C1"). Operator: GTE.
   - FIELD: Eligible academic fields, faculties, or majors (e.g. "STEM", "Computer Science", "Humanities", "Public Policy"). Operator: IN.
   - FINANCIAL: Demonstrated financial need or income ceilings. Operator: EQ.
   - OTHER: Other conditions (e.g. full-time enrollment commitment, commitment to return home). Operator: EQ.

2. Distinguish between Mandatory vs Preferred criteria:
   - isMandatory = true: Non-negotiable requirements (e.g., "Must have Bachelor's degree", "Minimum GPA of 3.7", "International students only").
   - isMandatory = false: Desirable or preferred qualifications (e.g., "Prior research experience preferred", "Preference given to applicants under 28").

3. Provide a clear, natural-language "description" for each requirement explaining the condition clearly to students.

Respond strictly with a valid JSON object matching the requested schema.`;

    // Execute with AI Audit logging
    const aiResult = await this.aiAuditService.executeStructuredWithAudit<ExtractedRequirementsOutput>({
      userId,
      taskType: 'ELIGIBILITY',
      prompt,
      systemPrompt:
        'You are an expert scholarship admissions officer. Extract all eligibility conditions accurately into normalized criteria without omitting GPA or degree restrictions.',
      schema: extractedRequirementsOutputSchema,
      anonymize: true,
      temperature: 0.1, // Deterministic extraction
    });

    const parsedOutput = aiResult.data;

    // Persist requirements in PostgreSQL
    const createdRequirements = await this.prisma.$transaction(async (tx) => {
      // Clear previous requirements for this scholarship to avoid duplicates
      await tx.eligibilityRequirement.deleteMany({
        where: { scholarshipId },
      });

      // Insert new requirements
      if (parsedOutput.requirements.length > 0) {
        return Promise.all(
          parsedOutput.requirements.map((req) =>
            tx.eligibilityRequirement.create({
              data: {
                scholarshipId,
                category: req.category as RequirementCategory,
                operator: req.operator as RequirementOperator,
                requiredValue: req.requiredValue.slice(0, 255),
                isMandatory: req.isMandatory,
                description: req.description.slice(0, 500),
              },
            })
          )
        );
      }
      return [];
    });

    const mandatoryCount = createdRequirements.filter((r) => r.isMandatory).length;
    const preferredCount = createdRequirements.length - mandatoryCount;

    return {
      scholarshipId,
      requirements: createdRequirements,
      extractionSummary: parsedOutput.extractionSummary,
      totalCount: createdRequirements.length,
      mandatoryCount,
      preferredCount,
      aiMetrics: {
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        tokensUsed: aiResult.totalTokens,
        costUSD: aiResult.costEstimate,
      },
    };
  }

  /**
   * Retrieves all eligibility requirements for a given scholarship.
   */
  async getRequirements(scholarshipId: string) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: scholarshipId },
    });

    if (!scholarship) {
      throw new AppError(`Scholarship with ID '${scholarshipId}' not found`, 404, 'NOT_FOUND');
    }

    return this.prisma.eligibilityRequirement.findMany({
      where: { scholarshipId },
      orderBy: [{ isMandatory: 'desc' }, { category: 'asc' }],
    });
  }

  /**
   * Manually adds a specific requirement to a scholarship.
   */
  async addManualRequirement(
    scholarshipId: string,
    input: CreateRequirementInput
  ) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: scholarshipId },
    });

    if (!scholarship) {
      throw new AppError(`Scholarship with ID '${scholarshipId}' not found`, 404, 'NOT_FOUND');
    }

    return this.prisma.eligibilityRequirement.create({
      data: {
        scholarshipId,
        category: input.category as RequirementCategory,
        operator: input.operator as RequirementOperator,
        requiredValue: input.requiredValue,
        isMandatory: input.isMandatory ?? true,
        description: input.description,
      },
    });
  }

  /**
   * Deletes a requirement by ID.
   */
  async deleteRequirement(requirementId: string) {
    const existing = await this.prisma.eligibilityRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!existing) {
      throw new AppError('Requirement not found', 404, 'NOT_FOUND');
    }

    return this.prisma.eligibilityRequirement.delete({
      where: { id: requirementId },
    });
  }
}
