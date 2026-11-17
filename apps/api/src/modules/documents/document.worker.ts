import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@scholaris/database';
import { S3Service } from './s3.service.js';
import {
  DocumentExtractorService,
  DocumentExtractionError,
} from './document-extractor.service.js';
import {
  DOCUMENT_EXTRACTION_QUEUE_NAME,
  DocumentExtractionJobData,
  getRedisConnection,
} from './document.queue.js';
import { env } from '../../config/env.js';

export interface ExtractionJobResult {
  success: boolean;
  textLength: number;
  pageCount?: number;
  error?: string;
}

/**
 * Core processing logic that can be executed directly by BullMQ workers
 * or invoked synchronously in test suites.
 */
export async function processDocumentExtraction(
  data: DocumentExtractionJobData,
  prisma: PrismaClient,
  s3Service: S3Service,
  extractor: DocumentExtractorService = new DocumentExtractorService()
): Promise<ExtractionJobResult> {
  const { documentId, fileKey, mimeType, name } = data;

  try {
    // 1. Mark status as PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: 'PROCESSING' },
    });

    // 2. Download file buffer from S3 storage
    const buffer = await s3Service.getObjectBuffer(fileKey);

    // 3. Extract plain text and metadata
    const result = await extractor.extractText(buffer, mimeType, name);

    // 4. Update document with extracted text and COMPLETED status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText: result.text,
        ocrStatus: 'COMPLETED',
      },
    });

    return {
      success: true,
      textLength: result.text.length,
      pageCount: result.pageCount,
    };
  } catch (err: any) {
    const errorMessage =
      err instanceof DocumentExtractionError
        ? err.message
        : `Extraction failure: ${err.message || 'Unknown error'}`;

    // Mark status as FAILED without throwing to avoid crash loops
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          ocrStatus: 'FAILED',
        },
      });
    } catch (dbErr: any) {
      console.error(`Failed to update document status to FAILED: ${dbErr.message}`);
    }

    return {
      success: false,
      textLength: 0,
      error: errorMessage,
    };
  }
}

/**
 * Creates and starts a BullMQ worker for the document extraction queue.
 */
export function createDocumentWorker(
  prisma: PrismaClient,
  s3Service: S3Service = new S3Service(),
  extractor: DocumentExtractorService = new DocumentExtractorService()
): Worker<DocumentExtractionJobData, ExtractionJobResult> | null {
  try {
    const connection = getRedisConnection();
    const worker = new Worker<DocumentExtractionJobData, ExtractionJobResult>(
      DOCUMENT_EXTRACTION_QUEUE_NAME,
      async (job: Job<DocumentExtractionJobData>) => {
        return processDocumentExtraction(job.data, prisma, s3Service, extractor);
      },
      {
        connection: connection as any,
        concurrency: 5,
      }
    );

    worker.on('completed', (job, result) => {
      if (env.NODE_ENV !== 'test') {
        console.log(`Document extraction job ${job.id} completed. Extracted ${result.textLength} chars.`);
      }
    });

    worker.on('failed', (job, err) => {
      if (env.NODE_ENV !== 'test') {
        console.error(`Document extraction job ${job?.id} failed:`, err);
      }
    });

    return worker;
  } catch (err: any) {
    if (env.NODE_ENV !== 'test') {
      console.warn(`Could not start BullMQ worker: ${err.message}`);
    }
    return null;
  }
}
