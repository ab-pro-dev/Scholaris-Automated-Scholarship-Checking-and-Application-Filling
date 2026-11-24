import { Page } from 'playwright';
import { PrismaClient } from '@scholaris/database';
import { ChallengeType, ChallengeDetectionResult } from '@scholaris/types';
import { ScreenshotService } from '../storage/screenshot.service.js';
import { AutomationJobData } from '../queue/automation.queue.js';

export interface InitiateHandoffParams {
  page: Page;
  jobData: AutomationJobData;
  browserSessionId?: string | null;
  challenge: ChallengeDetectionResult;
  prisma?: PrismaClient;
  screenshotService: ScreenshotService;
}

export interface HandoffState {
  isPausedForUser: boolean;
  challengeType: ChallengeType | null;
  reason: string;
  instructions: string;
  screenshotPath?: string;
  notificationId?: string;
}

export class HandoffProtocolService {
  /**
   * Initiates the interactive user login or CAPTCHA handoff protocol:
   * 1. Captures an audit screenshot showing the challenge/login wall.
   * 2. Transitions BrowserSession status to PAUSED_FOR_USER.
   * 3. Dispatches an ACTION_REQUIRED notification to the student with clear instructions.
   * 4. Ensures no credentials or passwords are ever captured or logged.
   */
  async initiateHandoff(params: InitiateHandoffParams): Promise<HandoffState> {
    const { page, jobData, browserSessionId, challenge, prisma, screenshotService } = params;

    // 1. Capture challenge screenshot for user visual reference & audit
    let screenshotPath: string | undefined;
    try {
      const buffer = await page.screenshot({ fullPage: false });
      screenshotPath = await screenshotService.saveScreenshot(
        buffer,
        jobData.jobId,
        'challenge'
      );
    } catch {
      // Continue even if screenshot fails
    }

    // 2. Update BrowserSession record to PAUSED_FOR_USER
    if (prisma && browserSessionId) {
      try {
        await prisma.browserSession.update({
          where: { id: browserSessionId },
          data: {
            sessionStatus: 'PAUSED_FOR_USER',
            errorMessage: challenge.reason,
            lastScreenshotUrl: screenshotPath,
          },
        });
      } catch (err: any) {
        console.warn(`Could not update browserSession ${browserSessionId}: ${err.message}`);
      }
    }

    // 3. Update AutomationJob with pause information
    if (prisma && jobData.jobId) {
      try {
        await prisma.automationJob.update({
          where: { id: jobData.jobId },
          data: {
            status: 'ACTIVE',
            errorLog: challenge.reason,
          },
        });
      } catch (err: any) {
        console.warn(`Could not update automationJob ${jobData.jobId}: ${err.message}`);
      }
    }

    // 4. Create ACTION_REQUIRED Notification for the student
    let notificationId: string | undefined;
    if (prisma && jobData.userId) {
      try {
        const linkUrl = jobData.applicationId
          ? `/applications/${jobData.applicationId}`
          : browserSessionId
          ? `/automation/sessions/${browserSessionId}`
          : '/scholarships';

        const notification = await prisma.notification.create({
          data: {
            userId: jobData.userId,
            type: 'ACTION_REQUIRED',
            title: 'Action Required: Scholarship Portal Verification',
            message: challenge.instructions,
            linkUrl,
          },
        });
        notificationId = notification.id;
      } catch (err: any) {
        console.warn(`Could not create notification for user ${jobData.userId}: ${err.message}`);
      }
    }

    return {
      isPausedForUser: true,
      challengeType: challenge.challengeType,
      reason: challenge.reason || 'Verification challenge requires user intervention',
      instructions: challenge.instructions,
      screenshotPath,
      notificationId,
    };
  }
}
