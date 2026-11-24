import { PrismaClient } from '@scholaris/database';
import { AppError, NotFoundError, ForbiddenError } from '@scholaris/shared';
import {
  CreateApplicationInput,
  UpdateFieldMappingInput,
  ResolveMissingInfoInput,
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
