import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

export const DOCUMENT_EXTRACTION_QUEUE_NAME = 'document-extraction';

export interface DocumentExtractionJobData {
  documentId: string;
  fileKey: string;
  mimeType: string;
  name: string;
  userId: string;
}

let redisConnection: Redis | null = null;
let documentQueue: Queue<DocumentExtractionJobData> | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop reconnecting after 3 attempts if Redis is offline
        return Math.min(times * 100, 2000);
      },
    });

    redisConnection.on('error', (err) => {
      // Avoid unhandled rejection when Redis is offline in dev/test
      if (env.NODE_ENV !== 'test') {
        console.warn(`Redis connection warning: ${err.message}`);
      }
    });
  }
  return redisConnection;
}

export function getDocumentQueue(): Queue<DocumentExtractionJobData> {
  if (!documentQueue) {
    const connection = getRedisConnection();
    documentQueue = new Queue<DocumentExtractionJobData>(DOCUMENT_EXTRACTION_QUEUE_NAME, {
      connection: connection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    });
  }
  return documentQueue;
}

/**
 * Enqueues a document extraction job to BullMQ.
 * Falls back gracefully if Redis is unavailable.
 */
export async function enqueueDocumentExtraction(
  data: DocumentExtractionJobData
): Promise<boolean> {
  // In test mode, skip Redis queue connection
  if (env.NODE_ENV === 'test') {
    return false;
  }

  try {
    const queue = getDocumentQueue();
    await queue.add('extract-text', data);
    return true;
  } catch (err: any) {
    console.warn(
      `Unable to enqueue BullMQ extraction job (Redis unavailable): ${err.message}`
    );
    return false;
  }
}
