import { z } from 'zod';
import { PrismaClient } from '@scholaris/database';
import { AppError, NotFoundError, ForbiddenError } from '@scholaris/shared';
import { DraftEssayInput } from '@scholaris/validation';
import { EssayDraftResult } from '@scholaris/types';
import { AIAuditService } from '../ai/ai-audit.service.js';

export const essayDraftResponseSchema = z.object({
  essayDraft: z.string().min(100),
  wordCount: z.number().int().positive(),
  keyHighlightsUsed: z.array(z.string()),
  suggestedEdits: z.array(z.string()),
});

export type EssayDraftResponse = z.infer<typeof essayDraftResponseSchema>;

export class EssayDrafterService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiAuditService: AIAuditService
  ) {}

  /**
   * Generates a tailored motivation statement or personal essay draft based on the student's
   * verified profile background (achievements, education, experiences) and scholarship details.
   *
   * Safety Invariant: The draft is marked with sourceType: 'AI_DRAFT' and explicitly requires
   * student review and editing before final submission.
   */
  async draftEssay(
    userId: string,
    applicationId: string,
    input: DraftEssayInput
  ): Promise<EssayDraftResult> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        scholarship: true,
        fields: true,
      },
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this application');
    }

    if (application.scholarship.verificationStatus === 'SUSPICIOUS') {
      throw new AppError(
        'Cannot draft an essay for a scholarship flagged as SUSPICIOUS. Processing is blocked for student safety.',
        400,
        'SCHOLARSHIP_SUSPICIOUS'
      );
    }

    // Retrieve student background
    const [profile, educationRecords, experiences, achievements, languageSkills] =
      await Promise.all([
        this.prisma.userProfile.findUnique({ where: { userId } }),
        this.prisma.educationRecord.findMany({
          where: { userId },
          orderBy: [{ isCurrent: 'desc' }, { endDate: 'desc' }],
        }),
        this.prisma.experience.findMany({
          where: { userId },
          orderBy: [{ isCurrent: 'desc' }, { endDate: 'desc' }],
        }),
        this.prisma.achievement.findMany({ where: { userId } }),
        this.prisma.languageSkill.findMany({ where: { userId } }),
      ]);

    const targetWordLimit = input.wordLimit || 500;
    const tone = input.targetTone || 'ACADEMIC';

    // Retrieve target field if specified
    const targetField = input.fieldId
      ? application.fields.find((f) => f.id === input.fieldId)
      : null;

    const studentContext = {
      name: profile?.fullName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
      nationality: profile?.nationality,
      residenceCountry: profile?.residenceCountry,
      financialBackground: profile?.financialStatement,
      education: educationRecords.map((e) => ({
        degree: e.degree,
        field: e.fieldOfStudy,
        institution: e.institution,
        gpa: e.gpa,
        maxGpa: e.maxGpa,
        honors: e.honors,
        isCurrent: e.isCurrent,
      })),
      experiences: experiences.map((exp) => ({
        role: exp.roleTitle,
        organization: exp.organization,
        type: exp.type,
        description: exp.description,
      })),
      achievements: achievements.map((a) => ({
        title: a.title,
        issuer: a.issuer,
        description: a.description,
      })),
      languages: languageSkills.map((l) => ({
        language: l.language,
        proficiency: l.proficiencyLevel,
        isNative: l.isNative,
      })),
    };

    const prompt = `You are the lead Admissions Essay & Personal Statement Drafting Specialist for Scholaris.
Draft an authentic, highly competitive personal statement / motivation essay tailored to the applicant's real background and this specific scholarship.

TARGET SCHOLARSHIP:
- Title: ${application.scholarship.title}
- Provider: ${application.scholarship.providerName}
- Target Field/Requirement: ${targetField?.label || 'General Motivation Statement'}

ESSAY PROMPT & INSTRUCTIONS:
"""
${input.prompt}
"""

TARGET SPECIFICATIONS:
- Word Limit: ~${targetWordLimit} words (strictly aim between ${Math.round(targetWordLimit * 0.85)} and ${Math.round(targetWordLimit * 1.05)} words).
- Tone: ${tone}.
- Perspective: First-person ("I").

STUDENT VERIFIED BACKGROUND:
${JSON.stringify(studentContext, null, 2)}

WRITING & INTEGRITY RULES:
1. GROUNDED IN FACT: Ground every assertion, project, and accomplishment in the student's verified profile data above. Do NOT invent fictional research papers, non-existent awards, or fabricated institutions.
2. COMPELLING NARRATIVE STRUCTURE:
   - Engaging opening that immediately articulates the student's academic passion and direction.
   - Evidence of academic rigor and demonstrated curiosity.
   - Tangible experience, leadership, or problem-solving impact.
   - Clear articulation of why THIS specific scholarship and program is the ideal catalyst for their trajectory.
   - Inspiring forward-looking conclusion on future community, academic, or professional impact.
3. CONCISENESS & CLARITY: Eliminate fluff, cliches ("Since I was a child..."), and generic buzzwords.
4. Provide a list of "keyHighlightsUsed" from the student profile.
5. Provide 2-3 "suggestedEdits" advising the student on personal nuances or specific anecdotes they should add during their review.

Respond strictly with a JSON object conforming to the requested schema.`;

    const aiResult = await this.aiAuditService.executeStructuredWithAudit<EssayDraftResponse>({
      userId,
      taskType: 'ESSAY_DRAFT',
      prompt,
      systemPrompt:
        'You are an expert scholarship admissions advisor. Draft impactful, strictly grounded personal statements tailored to verified applicant backgrounds.',
      schema: essayDraftResponseSchema,
      anonymize: true,
      temperature: 0.3,
    });

    const parsed = aiResult.data;

    // If attached to a specific field, save as AI_DRAFT in FieldMapping
    if (input.fieldId) {
      const existingMapping = await this.prisma.fieldMapping.findFirst({
        where: {
          applicationId,
          fieldId: input.fieldId,
        },
      });

      if (existingMapping) {
        await this.prisma.fieldMapping.update({
          where: { id: existingMapping.id },
          data: {
            mappedValue: parsed.essayDraft,
            sourceType: 'AI_DRAFT',
            sourcePath: 'ai.essayDraft',
            confidence: 0.85,
            isEditedByUser: false, // Explicit student review required!
          },
        });
      } else {
        await this.prisma.fieldMapping.create({
          data: {
            applicationId,
            fieldId: input.fieldId,
            mappedValue: parsed.essayDraft,
            sourceType: 'AI_DRAFT',
            sourcePath: 'ai.essayDraft',
            confidence: 0.85,
            isEditedByUser: false,
          },
        });
      }
    }

    return {
      applicationId,
      fieldId: input.fieldId || null,
      essayDraft: parsed.essayDraft,
      wordCount: parsed.wordCount,
      wordLimit: targetWordLimit,
      sourceType: 'AI_DRAFT',
      requiresUserReview: true,
      keyHighlightsUsed: parsed.keyHighlightsUsed,
      suggestedEdits: parsed.suggestedEdits,
      aiMetrics: {
        model: aiResult.model,
        tokensUsed: aiResult.totalTokens,
        latencyMs: aiResult.latencyMs,
        costUSD: aiResult.costEstimate,
      },
    };
  }
}
