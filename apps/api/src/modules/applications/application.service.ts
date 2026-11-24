import { PrismaClient } from '@scholaris/database';
import { AppError, NotFoundError, ForbiddenError } from '@scholaris/shared';
import {
  ApplicationReviewDTO,
  ReviewSection,
  ReviewFieldItem,
  ReviewDocumentItem,
} from '@scholaris/types';
import {
  CreateApplicationInput,
  UpdateFieldMappingInput,
  ResolveMissingInfoInput,
  UpdateMissingInfoInput,
  BulkUpdateMissingInfoInput,
} from '@scholaris/validation';

export class ApplicationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates or returns an existing application for a student and scholarship.
   */
  async createApplication(userId: string, input: CreateApplicationInput) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id: input.scholarshipId },
    });

    if (!scholarship) {
      throw new NotFoundError('Scholarship not found');
    }

    if (scholarship.verificationStatus === 'SUSPICIOUS') {
      throw new AppError(
        'Cannot apply to a scholarship flagged as SUSPICIOUS. Applications are blocked for student safety.',
        400,
        'SCHOLARSHIP_SUSPICIOUS'
      );
    }

    // Check if application already exists
    const existing = await this.prisma.application.findFirst({
      where: {
        userId,
        scholarshipId: input.scholarshipId,
      },
      include: {
        scholarship: true,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.application.create({
      data: {
        userId,
        scholarshipId: input.scholarshipId,
        status: 'DRAFT',
      },
      include: {
        scholarship: true,
      },
    });
  }

  /**
   * Retrieves application details by ID with fields, mappings, and missing information.
   */
  async getApplication(userId: string, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        scholarship: true,
        fields: {
          orderBy: [{ pageNumber: 'asc' }, { fieldKey: 'asc' }],
        },
        fieldMappings: {
          include: { field: true },
        },
        missingInformation: {
          include: { field: true },
        },
        applicationDocuments: {
          include: { document: true },
        },
        browserSessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this application');
    }

    return application;
  }

  /**
   * Prepares complete application review data for the pre-submission review screen (TASK-027).
   */
  async getApplicationReview(userId: string, applicationId: string): Promise<ApplicationReviewDTO> {
    const application = await this.getApplication(userId, applicationId);

    // Group fields into sections by pageNumber or semantic grouping
    const pageMap = new Map<number, ReviewFieldItem[]>();

    for (const field of application.fields) {
      const mapping = application.fieldMappings.find((m) => m.fieldId === field.id);
      const missing = application.missingInformation.find((m) => m.fieldId === field.id);

      const pageNum = field.pageNumber || 1;
      if (!pageMap.has(pageNum)) {
        pageMap.set(pageNum, []);
      }

      pageMap.get(pageNum)!.push({
        fieldId: field.id,
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: field.fieldType,
        options: field.options as string[] | null,
        isRequired: field.isRequired,
        pageNumber: pageNum,
        mappedValue: mapping?.mappedValue || null,
        sourceType: mapping?.sourceType || null,
        sourcePath: mapping?.sourcePath || null,
        confidence: mapping?.confidence || (missing?.isResolved ? 1.0 : 0.0),
        isEditedByUser: mapping?.isEditedByUser || false,
        isResolved: missing ? missing.isResolved : !!mapping?.mappedValue,
      });
    }

    const sections: ReviewSection[] = Array.from(pageMap.entries()).map(([pageNum, fields]) => {
      let name = `Page ${pageNum} Details`;
      if (pageNum === 1) {
        name = 'General Information & Personal Details';
      } else if (pageNum === 2) {
        name = 'Academic Background & Experiences';
      } else if (pageNum === 3) {
        name = 'Essays & Additional Requirements';
      }
      return {
        name,
        pageNumber: pageNum,
        fields,
      };
    });

    const attachedDocuments: ReviewDocumentItem[] = (application.applicationDocuments || []).map((ad: any) => ({
      id: ad.document.id,
      name: ad.document.name,
      category: ad.document.category,
      mimeType: ad.document.mimeType,
      sizeBytes: ad.document.sizeBytes,
      fileKey: ad.document.fileKey,
      fileUrl: ad.document.fileUrl,
      targetFieldKey: ad.targetFieldKey,
      attachedAt: ad.createdAt.toISOString(),
    }));

    const unresolvedMissingItems = application.missingInformation
      .filter((m: any) => !m.isResolved)
      .map((m: any) => ({
        id: m.id,
        prompt: m.prompt,
        category: m.category,
        fieldId: m.fieldId,
        fieldLabel: m.field?.label,
      }));

    const filledCount = application.fieldMappings.filter(
      (m: any) => m.mappedValue && m.mappedValue.trim().length > 0
    ).length;

    const totalCount = application.fields.length;
    const unresolvedCount = unresolvedMissingItems.length;

    return {
      applicationId: application.id,
      status: application.status,
      userApprovedAt: application.userApprovedAt?.toISOString() || null,
      submittedAt: application.submittedAt?.toISOString() || null,
      scholarship: {
        id: application.scholarship.id,
        title: application.scholarship.title,
        providerName: application.scholarship.providerName,
        websiteUrl: application.scholarship.websiteUrl,
        applicationUrl: application.scholarship.applicationUrl,
        deadline: application.scholarship.deadline?.toISOString() || null,
        fundingType: application.scholarship.fundingType,
      },
      previewScreenshotUrl: application.browserSessions[0]?.lastScreenshotUrl || null,
      summary: {
        totalFieldsCount: totalCount,
        filledFieldsCount: filledCount,
        unresolvedCount,
        missingCount: unresolvedCount,
        canAuthorizeSubmission: unresolvedCount === 0 && application.status === 'READY_FOR_REVIEW',
        completionPercentage: totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 100,
      },
      sections,
      attachedDocuments,
      unresolvedMissingItems,
    };
  }

  /**
   * Lists all applications for the student.
   */
  async listApplications(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: {
        scholarship: {
          select: {
            id: true,
            title: true,
            providerName: true,
            deadline: true,
            verificationStatus: true,
          },
        },
        _count: {
          select: {
            fields: true,
            fieldMappings: true,
            missingInformation: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Retrieves field mappings and missing information for an application.
   */
  async getFieldMappings(userId: string, applicationId: string) {
    await this.getApplication(userId, applicationId); // ownership check

    const [mappings, missingInfo] = await Promise.all([
      this.prisma.fieldMapping.findMany({
        where: { applicationId },
        include: { field: true },
        orderBy: { field: { pageNumber: 'asc' } },
      }),
      this.prisma.missingInformation.findMany({
        where: { applicationId },
        include: { field: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      applicationId,
      mappings,
      missingInformation: missingInfo,
      totalMappings: mappings.length,
      unresolvedMissingCount: missingInfo.filter((m) => !m.isResolved).length,
    };
  }

  /**
   * Allows the student to manually update a field mapping.
   */
  async updateFieldMapping(
    userId: string,
    applicationId: string,
    input: UpdateFieldMappingInput
  ) {
    await this.getApplication(userId, applicationId); // ownership check

    const existingMapping = await this.prisma.fieldMapping.findFirst({
      where: {
        applicationId,
        fieldId: input.fieldId,
      },
    });

    let updatedMapping;
    if (existingMapping) {
      updatedMapping = await this.prisma.fieldMapping.update({
        where: { id: existingMapping.id },
        data: {
          mappedValue: input.mappedValue,
          isEditedByUser: true,
          sourceType: 'USER_INPUT',
          confidence: 1.0,
        },
      });
    } else {
      updatedMapping = await this.prisma.fieldMapping.create({
        data: {
          applicationId,
          fieldId: input.fieldId,
          mappedValue: input.mappedValue,
          isEditedByUser: true,
          sourceType: 'USER_INPUT',
          confidence: 1.0,
        },
      });
    }

    // Resolve any corresponding missing information item
    await this.prisma.missingInformation.updateMany({
      where: {
        applicationId,
        fieldId: input.fieldId,
      },
      data: {
        isResolved: true,
        userResponse: input.mappedValue,
      },
    });

    return updatedMapping;
  }

  /**
   * Retrieves all missing information items for an application, including field details
   * and available document vault items for document uploads.
   */
  async getMissingInfo(userId: string, applicationId: string) {
    await this.getApplication(userId, applicationId); // ownership check

    const [missingItems, documents] = await Promise.all([
      this.prisma.missingInformation.findMany({
        where: { applicationId },
        include: { field: true },
        orderBy: [{ isResolved: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.document.findMany({
        where: { userId },
        select: { id: true, name: true, category: true },
      }),
    ]);

    return missingItems.map((item) => ({
      ...item,
      availableDocuments: item.category === 'DOCUMENT_UPLOAD' ? documents : [],
    }));
  }

  /**
   * Updates a single missing information item by its infoId.
   */
  async updateMissingInfo(
    userId: string,
    applicationId: string,
    infoId: string,
    input: UpdateMissingInfoInput
  ) {
    return this.resolveMissingInfo(userId, applicationId, {
      missingInfoId: infoId,
      userResponse: input.userResponse,
    });
  }

  /**
   * Bulk updates multiple missing information items.
   */
  async bulkUpdateMissingInfo(
    userId: string,
    applicationId: string,
    input: BulkUpdateMissingInfoInput
  ) {
    await this.getApplication(userId, applicationId); // ownership check

    const results = await Promise.all(
      input.items.map((item) =>
        this.resolveMissingInfo(userId, applicationId, {
          missingInfoId: item.missingInfoId,
          userResponse: item.userResponse,
        })
      )
    );

    const remainingCount = await this.prisma.missingInformation.count({
      where: {
        applicationId,
        isResolved: false,
      },
    });

    return {
      updatedCount: results.length,
      remainingMissingCount: remainingCount,
      isAllResolved: remainingCount === 0,
    };
  }

  /**
   * Resolves a missing information item with a student response.
   */
  async resolveMissingInfo(
    userId: string,
    applicationId: string,
    input: ResolveMissingInfoInput
  ) {
    await this.getApplication(userId, applicationId); // ownership check

    const missingItem = await this.prisma.missingInformation.findUnique({
      where: { id: input.missingInfoId },
    });

    if (!missingItem || missingItem.applicationId !== applicationId) {
      throw new NotFoundError('Missing information item not found for this application');
    }

    const updated = await this.prisma.missingInformation.update({
      where: { id: input.missingInfoId },
      data: {
        userResponse: input.userResponse,
        isResolved: true,
      },
    });

    // If attached to a specific field, create or update the FieldMapping
    if (missingItem.fieldId) {
      const existingMapping = await this.prisma.fieldMapping.findFirst({
        where: {
          applicationId,
          fieldId: missingItem.fieldId,
        },
      });

      if (existingMapping) {
        await this.prisma.fieldMapping.update({
          where: { id: existingMapping.id },
          data: {
            mappedValue: input.userResponse,
            sourceType: 'USER_INPUT',
            confidence: 1.0,
            isEditedByUser: true,
          },
        });
      } else {
        await this.prisma.fieldMapping.create({
          data: {
            applicationId,
            fieldId: missingItem.fieldId,
            mappedValue: input.userResponse,
            sourceType: 'USER_INPUT',
            confidence: 1.0,
            isEditedByUser: true,
          },
        });
      }
    }

    // Check if any unresolved missing items remain
    const remainingCount = await this.prisma.missingInformation.count({
      where: {
        applicationId,
        isResolved: false,
      },
    });

    if (remainingCount === 0) {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'READY_FOR_REVIEW' },
      });
    }

    return {
      resolvedItem: updated,
      remainingMissingCount: remainingCount,
      isAllResolved: remainingCount === 0,
    };
  }
}
