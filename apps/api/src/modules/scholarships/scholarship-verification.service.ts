import { z } from 'zod';
import { PrismaClient, VerificationStatus, FundingType } from '@scholaris/database';
import { AIAuditService } from '../ai/ai-audit.service.js';
import { evaluateDomainCredibility } from './domain-verifier.js';
import { ScholarshipFetcherService } from './scholarship-fetcher.service.js';
import { AppError } from '@scholaris/shared';

// Zod Schema for AI Structured Output
export const scholarshipVerificationOutputSchema = z.object({
  status: z.enum(['VERIFIED', 'UNCERTAIN', 'SUSPICIOUS']),
  confidenceScore: z.number().min(0).max(100),
  institutionMatch: z.boolean(),
  scamFlags: z.array(z.string()),
  summary: z.string().min(1),
  evidenceNotes: z.string().min(1),
  detectedDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be YYYY-MM-DD format')
    .nullable()
    .optional(),
  detectedFundingType: z
    .enum(['FULL', 'PARTIAL', 'TUITION_ONLY', 'STIPEND_ONLY', 'OTHER'])
    .optional(),
});

export type ScholarshipVerificationOutput = z.infer<
  typeof scholarshipVerificationOutputSchema
>;

export interface VerificationExecutionResult {
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

export class ScholarshipVerificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiAuditService: AIAuditService,
    private readonly fetcher: ScholarshipFetcherService = new ScholarshipFetcherService()
  ) {}

  /**
   * Pre-scans webpage text for high-risk scam heuristics before AI evaluation.
   */
  private scanHeuristicRedFlags(text: string, domain: string): string[] {
    const flags: string[] = [];
    const lowerText = text.toLowerCase();

    // 1. Upfront Fee / Payment request
    if (
      /\b(application\s+fee|processing\s+fee|registration\s+fee|admin\s+fee|wire\s+transfer|moneygram|western\s+union|gift\s+card|bitcoin|crypto|pay\s+to\s+apply)\b/i.test(
        lowerText
      )
    ) {
      flags.push('FEE_REQUIRED');
    }

    // 2. Sensitive banking / credential theft
    if (
      /\b(bank\s+account\s+pin|atm\s+card|online\s+banking\s+password|credit\s+card\s+cvv|routing\s+number\s+to\s+claim)\b/i.test(
        lowerText
      )
    ) {
      flags.push('CREDENTIAL_OR_BANKING_REQUEST');
    }

    // 3. Free public email used as primary contact for an institutional opportunity
    if (
      /@(gmail|yahoo|hotmail|outlook|protonmail|mail)\.com/i.test(lowerText) &&
      !domain.includes('gmail.com')
    ) {
      flags.push('SUSPICIOUS_FREE_EMAIL_CONTACT');
    }

    // 4. False guarantee claims
    if (
      /\b(100%\s+guaranteed|guaranteed\s+scholarship|everyone\s+wins|no\s+eligibility\s+required\s+money)\b/i.test(
        lowerText
      )
    ) {
      flags.push('UNREALISTIC_GUARANTEE');
    }

    return flags;
  }

  /**
   * Executes authenticity verification for a scholarship:
   * 1. Evaluates domain credibility (.edu, .gov, DAAD, Fulbright, etc.)
   * 2. Fetches clean web content if needed
   * 3. Runs heuristic pre-scan
   * 4. Dispatches schema-driven prompt to AI engine with audit logging
   * 5. Enforces safety rule (SUSPICIOUS scholarships blocked from form filling)
   * 6. Updates PostgreSQL Scholarship & ScholarshipSource records
   */
  async verifyScholarship(
    scholarshipId: string,
    userId?: string
  ): Promise<VerificationExecutionResult> {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: scholarshipId },
      include: { sources: true },
    });

    if (!scholarship) {
      throw new AppError(`Scholarship with ID '${scholarshipId}' not found`, 404, 'NOT_FOUND');
    }

    const domain = new URL(scholarship.websiteUrl).hostname.toLowerCase();
    const domainCredibility = evaluateDomainCredibility(domain);

    // Retrieve or fetch content
    let contentSnippet = scholarship.verificationSummary || '';
    if (!contentSnippet || contentSnippet.length < 50) {
      try {
        const fetched = await this.fetcher.fetchSafeContent(scholarship.websiteUrl);
        contentSnippet = fetched.cleanText;
      } catch (err: any) {
        contentSnippet = `Title: ${scholarship.title}. Provider: ${scholarship.providerName}. Domain: ${domain}`;
      }
    }

    const heuristicFlags = this.scanHeuristicRedFlags(contentSnippet, domain);

    // Construct structured verification prompt
    const prompt = `You are the lead Academic Security and Fraud Prevention Analyst for Scholaris.
Evaluate the following scholarship opportunity for authenticity, institutional corroboration, and potential scam indicators.

SCHOLARSHIP DETAILS:
- Title: ${scholarship.title}
- Provider / Institution: ${scholarship.providerName}
- Target Website URL: ${scholarship.websiteUrl}
- Domain: ${domain}
- Domain Category: ${domainCredibility.category}
- Domain Assessment: ${domainCredibility.notes}
- Pre-Scanned Heuristic Flags: ${heuristicFlags.length > 0 ? heuristicFlags.join(', ') : 'None'}

WEBPAGE CONTENT EXTRACT:
"""
${contentSnippet.slice(0, 3500)}
"""

EVALUATION INSTRUCTIONS:
1. Examine if the provider matches the domain (e.g. Oxford scholarship on ox.ac.uk, DAAD scholarship on daad.de).
2. Check for red flags:
   - FEE_REQUIRED: Demanding any upfront application, processing, or registration fee.
   - CREDENTIAL_OR_BANKING_REQUEST: Demanding sensitive bank accounts, PINs, or credentials.
   - SUSPICIOUS_FREE_EMAIL_CONTACT: Claiming to be a reputable university or government agency but listing a free Gmail/Yahoo email for submissions.
   - UNREALISTIC_GUARANTEE: Promising guaranteed payouts to all applicants regardless of merit or criteria.
   - DOMAIN_MISMATCH: Impersonating an established university from an unrelated third-party or spoofed domain.
3. Classification Rules:
   - "SUSPICIOUS": Any scholarship requiring upfront payment, requesting bank credentials, or spoofing an established institution. Confidence score MUST be <= 30.
   - "UNCERTAIN": Third-party directories, aggregator blogs, or private foundations where legitimacy cannot be 100% verified from the text alone, but no malicious flags are detected. Confidence score: 31-69.
   - "VERIFIED": Legitimate universities (.edu, .ac.uk), official governments, or known international scholarship trusts with clean criteria and no fees. Confidence score: 70-100.
4. If a deadline or funding type is clearly stated in the text, extract it.

Respond strictly with a valid JSON object matching the requested schema.`;

    // Execute with AI Audit logging and rate limiting
    const aiResult = await this.aiAuditService.executeStructuredWithAudit<ScholarshipVerificationOutput>({
      userId,
      taskType: 'VERIFICATION',
      prompt,
      systemPrompt:
        'You are an expert fraud investigator. Never mark a scholarship with upfront fees or bank PIN requests as VERIFIED.',
      schema: scholarshipVerificationOutputSchema,
      anonymize: true, // Always mask student PII
      temperature: 0.1, // Strict deterministic evaluation
    });

    const verification = aiResult.data;

    // Strict security rule override: If heuristic detected upfront fee or credential request, enforce SUSPICIOUS
    if (
      heuristicFlags.includes('FEE_REQUIRED') ||
      heuristicFlags.includes('CREDENTIAL_OR_BANKING_REQUEST')
    ) {
      if (verification.status !== 'SUSPICIOUS') {
        verification.status = 'SUSPICIOUS';
        verification.confidenceScore = Math.min(25, verification.confidenceScore);
        if (!verification.scamFlags.includes('FEE_REQUIRED')) {
          verification.scamFlags.push('FEE_REQUIRED');
        }
      }
    }

    // Safety rule: Any scholarship marked SUSPICIOUS strictly prohibits automated application
    const isEligibleForAutoFill = verification.status !== 'SUSPICIOUS';

    // Update Scholarship in PostgreSQL
    const updateData: any = {
      verificationStatus: verification.status,
      verificationScore: verification.confidenceScore,
      verificationSummary: verification.summary,
    };

    if (verification.detectedDeadline) {
      const parsedDeadline = new Date(verification.detectedDeadline);
      if (!isNaN(parsedDeadline.getTime())) {
        updateData.deadline = parsedDeadline;
      }
    }

    if (verification.detectedFundingType) {
      updateData.fundingType = verification.detectedFundingType as FundingType;
    }

    await this.prisma.scholarship.update({
      where: { id: scholarshipId },
      data: updateData,
    });

    // Update or Create ScholarshipSource entry
    const primarySource = scholarship.sources[0];
    if (primarySource) {
      await this.prisma.scholarshipSource.update({
        where: { id: primarySource.id },
        data: {
          institutionMatch: verification.institutionMatch,
          scamFlagsDetected: verification.scamFlags,
          evidenceNotes: verification.evidenceNotes,
        },
      });
    } else {
      await this.prisma.scholarshipSource.create({
        data: {
          scholarshipId,
          sourceUrl: scholarship.websiteUrl,
          sourceDomain: domain,
          institutionMatch: verification.institutionMatch,
          scamFlagsDetected: verification.scamFlags,
          evidenceNotes: verification.evidenceNotes,
        },
      });
    }

    return {
      scholarshipId,
      status: verification.status as VerificationStatus,
      confidenceScore: verification.confidenceScore,
      institutionMatch: verification.institutionMatch,
      scamFlags: verification.scamFlags,
      summary: verification.summary,
      evidenceNotes: verification.evidenceNotes,
      isEligibleForAutoFill,
      aiMetrics: {
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        tokensUsed: aiResult.totalTokens,
        costUSD: aiResult.costEstimate,
      },
    };
  }
}
