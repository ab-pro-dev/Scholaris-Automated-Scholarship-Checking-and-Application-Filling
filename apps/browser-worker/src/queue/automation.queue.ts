import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const BROWSER_AUTOMATION_QUEUE_NAME = 'scholaris-browser-automation';

export interface AutomationJobData {
  jobId: string;
  applicationId?: string;
  scholarshipId?: string;
  type: 'VERIFY_URL' | 'EXTRACT_FORM' | 'FILL_FORM' | 'SUBMIT_APPLICATION';
  targetUrl: string;
  userId: string;
  userApproved?: boolean;
  userApprovedAt?: string | Date | null;
  fieldValues?: Record<string, string>;
}

export interface AutomationJobResult {
  success: boolean;
  pageTitle?: string;
  detectedFieldsCount?: number;
  filledFieldsCount?: number;
  screenshotPath?: string;
  error?: string;
  blockedRequestsCount: number;
}

let redisConnection: Redis | null = null;
let automationQueue: Queue<AutomationJobData> | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 2000);
      },
    });

    redisConnection.on('error', (err) => {
      if (env.NODE_ENV !== 'test') {
        console.warn(`Redis connection warning: ${err.message}`);
      }
    });
  }
  return redisConnection;
}

export function getAutomationQueue(): Queue<AutomationJobData> {
  if (!automationQueue) {
    const connection = getRedisConnection();
    automationQueue = new Queue<AutomationJobData>(BROWSER_AUTOMATION_QUEUE_NAME, {
      connection: connection as any,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return automationQueue;
}
