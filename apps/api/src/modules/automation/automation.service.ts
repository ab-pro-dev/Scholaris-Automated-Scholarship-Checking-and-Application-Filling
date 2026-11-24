import { PrismaClient } from '@scholaris/database';
import { NotFoundError, ForbiddenError, ValidationError } from '@scholaris/shared';
import { ResumeSessionInput } from '@scholaris/validation';
import { enqueueAutomationJob } from './automation.queue.js';

export class AutomationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Retrieves a browser session and verifies student ownership.
   */
  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.browserSession.findUnique({
      where: { id: sessionId },
      include: {
        automationJob: true,
        application: {
          select: { id: true, userId: true, scholarshipId: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Browser session not found');
    }

    // Tenant isolation: verify user owns the associated application if attached
    if (session.application && session.application.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this session');
    }

    return session;
  }

  /**
   * Resumes a paused browser session after student confirms completing the login or CAPTCHA challenge.
   */
  async resumeSession(
    userId: string,
    sessionId: string,
    _input: ResumeSessionInput = { userConfirmed: true }
  ) {
    const session = await this.getSession(userId, sessionId);

    if (session.sessionStatus !== 'PAUSED_FOR_USER') {
      throw new ValidationError(
        `Cannot resume session in status "${session.sessionStatus}". Only PAUSED_FOR_USER sessions can be resumed.`
      );
    }

    // Transactionally update session and resolve pending action notifications
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.browserSession.update({
        where: { id: sessionId },
        data: {
          sessionStatus: 'RUNNING',
          errorMessage: null,
        },
        include: {
          automationJob: true,
        },
      });

      if (session.jobId) {
        await tx.automationJob.update({
          where: { id: session.jobId },
          data: {
            status: 'ACTIVE',
            errorLog: null,
          },
        });
      }

      // Mark associated notifications as read
      await tx.notification.updateMany({
        where: {
          userId,
          type: 'ACTION_REQUIRED',
          isRead: false,
          OR: [
            { linkUrl: { contains: sessionId } },
            session.applicationId ? { linkUrl: { contains: session.applicationId } } : {},
          ],
        },
        data: { isRead: true },
      });

      return updatedSession;
    });

    // Enqueue BullMQ resume execution if background worker is active
    if (session.automationJob) {
      await enqueueAutomationJob({
        jobId: session.automationJob.id,
        applicationId: session.applicationId || undefined,
        type: session.automationJob.type as any,
        targetUrl: '',
        userId,
        isResumed: true,
        resumedSessionId: sessionId,
      });
    }

    return {
      session: updated,
      resumed: true,
      message: 'Browser automation session resumed successfully.',
    };
  }

  /**
   * Aborts a browser session when student chooses to cancel the automated task.
   */
  async abortSession(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.browserSession.update({
        where: { id: sessionId },
        data: {
          sessionStatus: 'ERROR',
          errorMessage: 'Session aborted by student.',
        },
      });

      if (session.jobId) {
        await tx.automationJob.update({
          where: { id: session.jobId },
          data: {
            status: 'FAILED',
            errorLog: 'Session aborted by student.',
          },
        });
      }

      // Dismiss related action notifications
      await tx.notification.updateMany({
        where: {
          userId,
          type: 'ACTION_REQUIRED',
          isRead: false,
          OR: [
            { linkUrl: { contains: sessionId } },
            session.applicationId ? { linkUrl: { contains: session.applicationId } } : {},
          ],
        },
        data: { isRead: true },
      });

      return updatedSession;
    });

    return {
      session: updated,
      aborted: true,
      message: 'Browser automation session aborted.',
    };
  }

  /**
   * Lists notifications for a student.
   */
  async getNotifications(userId: string, options: { unreadOnly?: boolean } = {}) {
    const where: any = { userId };
    if (options.unreadOnly) {
      where.isRead = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Marks a notification as read.
   */
  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this notification');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}
