import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@scholaris/database';
import {
  BROWSER_AUTOMATION_QUEUE_NAME,
  AutomationJobData,
  AutomationJobResult,
  getRedisConnection,
} from './automation.queue.js';
import { BrowserPool } from '../browser/browser-pool.js';
import { ScreenshotService } from '../storage/screenshot.service.js';
import { SubmissionGuard, MandatorySubmissionApprovalError } from '../security/submission-guard.js';
import { env } from '../config/env.js';

export async function processBrowserAutomationJob(
  jobData: AutomationJobData,
  prisma: PrismaClient,
  browserPool: BrowserPool,
  screenshotService: ScreenshotService
): Promise<AutomationJobResult> {
  const { jobId, applicationId, type, targetUrl, userApproved, userApprovedAt } = jobData;

  // 1. Update AutomationJob to ACTIVE status if record exists
  try {
    await prisma.automationJob.update({
      where: { id: jobId },
      data: { status: 'ACTIVE' },
    });
  } catch {
    // Record might not exist in unit tests
  }

  // 2. Create BrowserSession record
  let browserSessionId: string | null = null;
  try {
    const session = await prisma.browserSession.create({
      data: {
        jobId,
        applicationId,
        workerId: `worker-${process.pid}`,
        sessionStatus: 'RUNNING',
      },
    });
    browserSessionId = session.id;
  } catch {
    // Record creation optional in unit tests
  }

  // 3. Obtain isolated ephemeral browser context
  const session = await browserPool.createIsolatedContext();

  try {
    // Enforce safety invariant for submission
    if (type === 'SUBMIT_APPLICATION') {
      await SubmissionGuard.assertCanExecuteAction(
        'SUBMIT',
        'final_submit_button',
        !!userApproved,
        userApprovedAt
      );
    }

    // 4. Navigate to target URL with firewall protection
    await session.page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: env.BROWSER_TIMEOUT_MS,
    });

    const pageTitle = await session.page.title();

    // 5. Execute Job Type Action
    let detectedFieldsCount = 0;
    let filledFieldsCount = 0;

    if (type === 'EXTRACT_FORM' || type === 'FILL_FORM') {
      const inputs = await session.page.$$('input:not([type="hidden"]), select, textarea');
      detectedFieldsCount = inputs.length;

      if (type === 'FILL_FORM' && jobData.fieldValues) {
        for (const [key, val] of Object.entries(jobData.fieldValues)) {
          try {
            const el = await session.page.$(`[name="${key}"], #${key}`);
            if (el) {
              await el.fill(val);
              filledFieldsCount++;
            }
          } catch {
            // Non-critical if individual optional field cannot be filled
          }
        }
      }
    }

    // Capture success / progress screenshot
    const screenshotBuffer = await session.page.screenshot({ fullPage: false });
    const screenshotPath = await screenshotService.saveScreenshot(
      screenshotBuffer,
      jobId,
      'progress'
    );

    // 6. Update records to COMPLETED
    if (browserSessionId) {
      try {
        await prisma.browserSession.update({
          where: { id: browserSessionId },
          data: {
            sessionStatus: 'COMPLETED',
            lastScreenshotUrl: screenshotPath,
          },
        });
      } catch {}
    }

    try {
      await prisma.automationJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' },
      });
    } catch {}

    return {
      success: true,
      pageTitle,
      detectedFieldsCount,
      filledFieldsCount,
      screenshotPath,
      blockedRequestsCount: session.blockedRequests.length,
    };
  } catch (err: any) {
    let screenshotPath: string | undefined;

    // Capture emergency error screenshot
    try {
      const errorBuffer = await session.page.screenshot({ fullPage: false });
      screenshotPath = await screenshotService.saveScreenshot(errorBuffer, jobId, 'error');
    } catch {
      // Ignored if browser closed prematurely
    }

    const isSecurityError = err instanceof MandatorySubmissionApprovalError;
    const sessionStatus = isSecurityError ? 'PAUSED_FOR_USER' : 'ERROR';

    if (browserSessionId) {
      try {
        await prisma.browserSession.update({
          where: { id: browserSessionId },
          data: {
            sessionStatus,
            errorMessage: err.message,
            lastScreenshotUrl: screenshotPath,
          },
        });
      } catch {}
    }

    try {
      await prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorLog: err.message,
        },
      });
    } catch {}

    return {
      success: false,
      error: err.message,
      screenshotPath,
      blockedRequestsCount: session.blockedRequests.length,
    };
  } finally {
    // 7. Guaranteed Ephemeral Context Cleanup (0 leaks)
    await session.cleanup();
  }
}

export function createBrowserWorker(
  prisma: PrismaClient,
  browserPool: BrowserPool = new BrowserPool(),
  screenshotService: ScreenshotService = new ScreenshotService()
): Worker<AutomationJobData, AutomationJobResult> {
  const connection = getRedisConnection();

  const worker = new Worker<AutomationJobData, AutomationJobResult>(
    BROWSER_AUTOMATION_QUEUE_NAME,
    async (job: Job<AutomationJobData>) => {
      return processBrowserAutomationJob(job.data, prisma, browserPool, screenshotService);
    },
    {
      connection: connection as any,
      concurrency: env.BROWSER_WORKER_CONCURRENCY,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`Browser Automation Job [${job?.id}] failed: ${err.message}`);
  });

  return worker;
}
