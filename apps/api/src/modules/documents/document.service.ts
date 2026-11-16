import { randomUUID } from 'crypto';
import { PrismaClient } from '@scholaris/database';
import { DocumentDTO, DocumentCategory } from '@scholaris/types';
import { NotFoundError, ForbiddenError } from '@scholaris/shared';
import {
  PresignedUploadRequestInput,
  ConfirmUploadInput,
} from '@scholaris/validation';
import { S3Service } from './s3.service.js';

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

export interface PresignedDownloadResponse {
  downloadUrl: string;
  expiresInSeconds: number;
  document: DocumentDTO;
}

export class DocumentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly s3Service: S3Service
  ) {}

  /**
   * Generates a cryptographic presigned PUT URL for client-side direct upload to S3/MinIO.
   */
  async generatePresignedUpload(
    userId: string,
    input: PresignedUploadRequestInput
  ): Promise<PresignedUploadResponse> {
    const sanitizedFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueId = randomUUID();
    const fileKey = `documents/${userId}/${uniqueId}-${sanitizedFilename}`;
    const expiresInSeconds = 900; // 15 minutes

    const uploadUrl = await this.s3Service.getPresignedUploadUrl(
      fileKey,
      input.mimeType,
      expiresInSeconds
    );

    return {
      uploadUrl,
      fileKey,
      expiresInSeconds,
    };
  }

  /**
   * Confirms successful upload to storage and records document entry in the database.
   */
  async confirmUpload(
    userId: string,
    input: ConfirmUploadInput
  ): Promise<DocumentDTO> {
    // Tenant safety check: Ensure the fileKey belongs to the calling user
    const expectedPrefix = `documents/${userId}/`;
    if (!input.fileKey.startsWith(expectedPrefix)) {
      throw new ForbiddenError('Unauthorized file path access');
    }

    const document = await this.prisma.document.create({
      data: {
        userId,
        name: input.name,
        category: input.category,
        fileKey: input.fileKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksum: input.checksum || '',
        ocrStatus: 'PENDING',
      },
    });

    return this.mapDocumentToDTO(document);
  }

  /**
   * Lists all uploaded documents for the authenticated student.
   */
  async listDocuments(
    userId: string,
    category?: DocumentCategory
  ): Promise<DocumentDTO[]> {
    const documents = await this.prisma.document.findMany({
      where: {
        userId,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map(this.mapDocumentToDTO);
  }

  /**
   * Retrieves a short-lived presigned GET download URL with strict user isolation.
   */
  async getDocumentDownloadUrl(
    userId: string,
    documentId: string
  ): Promise<PresignedDownloadResponse> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundError('Document not found or access denied');
    }

    const expiresInSeconds = 300; // 5 minutes
    const downloadUrl = await this.s3Service.getPresignedDownloadUrl(
      document.fileKey,
      expiresInSeconds,
      document.name
    );

    return {
      downloadUrl,
      expiresInSeconds,
      document: this.mapDocumentToDTO(document),
    };
  }

  /**
   * Deletes a document from both S3 storage and the database.
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundError('Document not found or access denied');
    }

    // Delete from S3 storage
    await this.s3Service.deleteObject(document.fileKey);

    // Delete record from database
    await this.prisma.document.delete({
      where: { id: documentId },
    });
  }

  private mapDocumentToDTO(doc: any): DocumentDTO {
    return {
      id: doc.id,
      userId: doc.userId,
      name: doc.name,
      category: doc.category,
      fileKey: doc.fileKey,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      extractedText: doc.extractedText ?? null,
      ocrStatus: doc.ocrStatus,
      checksum: doc.checksum,
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }
}
