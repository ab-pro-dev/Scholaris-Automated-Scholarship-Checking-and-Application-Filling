import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

export const BROWSER_AUTOMATION_QUEUE_NAME = 'scholaris-browser-automation';

export interface AutomationJobPayload {
  jobId: string;
  applicationId?: string;
  scholarshipId?: string;
  type: 'VERIFY_URL' | 'EXTRACT_FORM' | 'FILL_FORM' | 'SUBMIT_APPLICATION';
  targetUrl: string;
  userId: string;
  userApproved?: boolean;
  userApprovedAt?: string | Date | null;
  fieldValues?: Record<string, string>;
  isResumed?: boolean;
  resumedSessionId?: string;
}

let redisConnection: Redis | null = null;
let automationQueue: Queue<AutomationJobPayload> | null = null;

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

export function getAutomationQueue(): Queue<AutomationJobPayload> {
  if (!automationQueue) {
    const connection = getRedisConnection();
    automationQueue = new Queue<AutomationJobPayload>(BROWSER_AUTOMATION_QUEUE_NAME, {
      connection: connection as any,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    });
  }
  return automationQueue;
}

export async function enqueueAutomationJob(
  data: AutomationJobPayload
): Promise<boolean> {
  if (env.NODE_ENV === 'test') {
    return false;
  }

  try {
    const queue = getAutomationQueue();
    await queue.add(`automation-${data.type.toLowerCase()}`, data);
    return true;
  } catch (err: any) {
    console.warn(
      `Unable to enqueue BullMQ browser automation job (Redis unavailable): ${err.message}`
    );
    return false;
  }
}
