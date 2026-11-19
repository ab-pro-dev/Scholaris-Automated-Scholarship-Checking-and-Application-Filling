import { PrismaClient, VerificationStatus } from '@scholaris/database';
import { AnalyzeScholarshipInput } from '@scholaris/validation';
import { ScholarshipFetcherService, FetchedWebContent } from './scholarship-fetcher.service.js';
import { AppError } from '@scholaris/shared';

export interface ListScholarshipsQuery {
  status?: VerificationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AnalyzeResult {
  scholarship: any;
  isExisting: boolean;
  extractedPreview: {
    title: string;
    description?: string;
    cleanTextSnippet: string;
    finalUrl: string;
    contentLengthBytes: number;
  };
}

export class ScholarshipService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fetcher: ScholarshipFetcherService = new ScholarshipFetcherService()
  ) {}

  /**
   * Helper to extract friendly provider name from domain
   * e.g. "www.ox.ac.uk" -> "ox.ac.uk" or "daad.de" -> "DAAD"
   */
  private extractProviderFromDomain(domain: string): string {
    const clean = domain.replace(/^www\./i, '');
    const parts = clean.split('.');
    if (parts.length >= 2) {
      return parts[0].toUpperCase();
    }
    return clean;
  }

  /**
   * Submits a scholarship URL for SSRF-protected ingestion and initial content retrieval.
   * Creates a Scholarship record with status PENDING.
   */
  async analyzeUrl(
    _userId: string | undefined,
    input: AnalyzeScholarshipInput
  ): Promise<AnalyzeResult> {
    // 1. Fetch content safely with SSRF protection
    const fetched: FetchedWebContent = await this.fetcher.fetchSafeContent(input.url);

    const parsedUrl = new URL(fetched.finalUrl);
    const domain = parsedUrl.hostname.toLowerCase();

    // 2. Derive Title and Provider Name
    const title = (input.title || fetched.title || `Scholarship at ${domain}`).trim();
    const providerName = (
      input.providerName || this.extractProviderFromDomain(domain)
    ).trim();

    // 3. Check if scholarship already recorded
    const existing = await this.prisma.scholarship.findFirst({
      where: {
        websiteUrl: fetched.finalUrl,
      },
      include: {
        sources: true,
        requirements: true,
      },
    });

    if (existing) {
      // Ensure current sourceUrl is tracked in sources
      const hasSource = existing.sources.some(
        (s: any) => s.sourceUrl === input.url || s.sourceUrl === fetched.finalUrl
      );
      if (!hasSource) {
        await this.prisma.scholarshipSource.create({
          data: {
            scholarshipId: existing.id,
            sourceUrl: input.url,
            sourceDomain: domain,
            institutionMatch: false,
            scamFlagsDetected: [],
            evidenceNotes: `Referenced by student ingestion. Initial fetch (${fetched.contentLengthBytes} bytes).`,
          },
        });
      }

      return {
        scholarship: existing,
        isExisting: true,
        extractedPreview: {
          title: fetched.title,
          description: fetched.metaDescription,
          cleanTextSnippet: fetched.cleanText.slice(0, 1000),
          finalUrl: fetched.finalUrl,
          contentLengthBytes: fetched.contentLengthBytes,
        },
      };
    }

    // 4. Create new Scholarship with status PENDING
    const scholarship = await this.prisma.scholarship.create({
      data: {
        title: title.slice(0, 255),
        providerName: providerName.slice(0, 255),
        websiteUrl: fetched.finalUrl,
        applicationUrl: fetched.finalUrl,
        verificationStatus: 'PENDING',
        verificationScore: 0.0,
        verificationSummary: fetched.metaDescription || null,
        sources: {
          create: {
            sourceUrl: input.url,
            sourceDomain: domain,
            institutionMatch: false,
            scamFlagsDetected: [],
            evidenceNotes: `Initial ingestion content retrieved (${fetched.contentLengthBytes} bytes). Pending AI verification.`,
          },
        },
      },
      include: {
        sources: true,
        requirements: true,
      },
    });

    return {
      scholarship,
      isExisting: false,
      extractedPreview: {
        title: fetched.title,
        description: fetched.metaDescription,
        cleanTextSnippet: fetched.cleanText.slice(0, 1000),
        finalUrl: fetched.finalUrl,
        contentLengthBytes: fetched.contentLengthBytes,
      },
    };
  }

  /**
   * Retrieves scholarship by UUID with its sources and requirements.
   */
  async getScholarshipById(id: string) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id },
      include: {
        sources: true,
        requirements: true,
      },
    });

    if (!scholarship) {
      throw new AppError('Scholarship not found', 404, 'NOT_FOUND');
    }

    return scholarship;
  }

  /**
   * Queries paginated list of scholarships with optional filters.
   */
  async listScholarships(query: ListScholarshipsQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.verificationStatus = query.status;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { providerName: { contains: query.search, mode: 'insensitive' } },
        { websiteUrl: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.scholarship.count({ where }),
      this.prisma.scholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sources: true,
          requirements: true,
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
