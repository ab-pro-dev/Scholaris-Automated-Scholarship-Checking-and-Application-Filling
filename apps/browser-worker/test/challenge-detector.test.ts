import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPool } from '../src/browser/browser-pool.js';
import { ScreenshotService } from '../src/storage/screenshot.service.js';
import { ChallengeDetector } from '../src/security/challenge-detector.js';
import { HandoffProtocolService } from '../src/security/handoff-protocol.service.js';
import { processBrowserAutomationJob } from '../src/queue/automation.worker.js';
import { PrismaClient } from '@scholaris/database';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('Interactive User Login & CAPTCHA Handoff Protocol (TASK-023)', () => {
  const browserPool = new BrowserPool();
  const testScreenshotsDir = path.join(process.cwd(), 'test-challenge-screenshots');
  const screenshotService = new ScreenshotService(testScreenshotsDir);
  const challengeDetector = new ChallengeDetector();
  const handoffService = new HandoffProtocolService();

  // In-memory mock database tables
  const browserSessionsTable = new Map<string, any>();
  const automationJobsTable = new Map<string, any>();
  const notificationsTable: any[] = [];

  const mockPrisma = {
    browserSession: {
      create: async ({ data }: any) => {
        const id = 'sess-' + Math.random().toString(36).substring(7);
        const record = { id, ...data, createdAt: new Date() };
        browserSessionsTable.set(id, record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const existing = browserSessionsTable.get(where.id) || {};
        const updated = { ...existing, ...data };
        browserSessionsTable.set(where.id, updated);
        return updated;
      },
      findUnique: async ({ where }: any) => {
        return browserSessionsTable.get(where.id) || null;
      },
    },
    automationJob: {
      update: async ({ where, data }: any) => {
        const existing = automationJobsTable.get(where.id) || {};
        const updated = { ...existing, ...data };
        automationJobsTable.set(where.id, updated);
        return updated;
      },
    },
    notification: {
      create: async ({ data }: any) => {
        const record = {
          id: 'notif-' + Math.random().toString(36).substring(7),
          ...data,
          isRead: false,
          createdAt: new Date(),
        };
        notificationsTable.push(record);
        return record;
      },
    },
  } as unknown as PrismaClient;

  afterAll(async () => {
    await browserPool.close();
    try {
      await fs.rm(testScreenshotsDir, { recursive: true, force: true });
    } catch {}
  });

  it('detects Google reCAPTCHA and identifies human verification challenge', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    await session.page.setContent(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Portal Login</title></head>
        <body>
          <h2>Scholarship Application Portal</h2>
          <div class="g-recaptcha" data-sitekey="6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-"></div>
          <iframe src="/mock/recaptcha/api2/anchor"></iframe>
        </body>
      </html>
    `,
      { waitUntil: 'domcontentloaded' }
    );

    const result = await challengeDetector.detectChallenge(session.page);
    expect(result.detected).toBe(true);
    expect(result.challengeType).toBe('CAPTCHA');
    expect(result.reason).toContain('reCAPTCHA');
    expect(result.instructions).toContain('Google reCAPTCHA');

    await session.cleanup();
  });

  it('detects Cloudflare Turnstile anti-bot verification challenge', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    await session.page.setContent(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Just a moment...</title></head>
        <body>
          <div class="cf-turnstile"></div>
          <iframe src="/mock/challenges.cloudflare.com/turnstile/v0"></iframe>
          <p>Verify you are human to continue.</p>
        </body>
      </html>
    `,
      { waitUntil: 'domcontentloaded' }
    );

    const result = await challengeDetector.detectChallenge(session.page);
    expect(result.detected).toBe(true);
    expect(result.challengeType).toBe('BOT_DETECTION');
    expect(result.reason).toContain('Cloudflare');

    await session.cleanup();
  });

  it('detects login wall with password input requiring student manual authentication', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    await session.page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Sign In - DAAD Portal</title></head>
        <body>
          <h2>Sign in to your account</h2>
          <form id="login-form" action="/auth/login" method="POST">
            <label for="username">Username / Email</label>
            <input type="text" id="username" name="username" />
            <label for="password">Password</label>
            <input type="password" id="password" name="password" />
            <button type="submit">Log In</button>
          </form>
        </body>
      </html>
    `);

    const result = await challengeDetector.detectChallenge(session.page);
    expect(result.detected).toBe(true);
    expect(result.challengeType).toBe('LOGIN_REQUIRED');
    expect(result.reason).toContain('requires user authentication');
    expect(result.instructions).toContain('Scholaris never collects or stores your external passwords');

    await session.cleanup();
  });

  it('detects Two-Factor Authentication (2FA) verification wall', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    await session.page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Security Verification</title></head>
        <body>
          <h2>Two-Factor Authentication</h2>
          <p>Please enter the 6-digit verification code sent to your mobile device.</p>
          <input type="text" name="otp_code" id="otp_code" placeholder="123456" />
          <button type="submit">Verify Code</button>
        </body>
      </html>
    `);

    const result = await challengeDetector.detectChallenge(session.page);
    expect(result.detected).toBe(true);
    expect(result.challengeType).toBe('TWO_FACTOR_AUTH');
    expect(result.reason).toContain('Multi-Factor');

    await session.cleanup();
  });

  it('strictly sanitizes form fields removing any external passwords or credentials (Safety Invariant)', () => {
    const unsafeInputs = {
      first_name: 'Marie',
      last_name: 'Curie',
      portal_password: 'SuperSecretPassword123!',
      account_pin: '9876',
      credential_token: 'tok_abc123',
      gpa: '3.98',
    };

    const sanitized = challengeDetector.sanitizeFieldValues(unsafeInputs);

    // Passwords, pins, and tokens must be stripped
    expect(sanitized.portal_password).toBeUndefined();
    expect(sanitized.account_pin).toBeUndefined();
    expect(sanitized.credential_token).toBeUndefined();

    // Legitimate scholarship profile data preserved
    expect(sanitized.first_name).toBe('Marie');
    expect(sanitized.last_name).toBe('Curie');
    expect(sanitized.gpa).toBe('3.98');
  });

  it('initiates handoff protocol: marks session PAUSED_FOR_USER, creates notification and audit screenshot', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    await session.page.setContent(`
      <html>
        <body>
          <div class="g-recaptcha"></div>
          <h2>Please complete CAPTCHA to continue</h2>
        </body>
      </html>
    `);

    const challenge = await challengeDetector.detectChallenge(session.page);
    const testSessionId = 'sess-handoff-test-1';
    browserSessionsTable.set(testSessionId, { id: testSessionId, sessionStatus: 'RUNNING' });

    const handoff = await handoffService.initiateHandoff({
      page: session.page,
      jobData: {
        jobId: 'job-handoff-1',
        applicationId: 'app-handoff-1',
        type: 'EXTRACT_FORM',
        targetUrl: 'https://example.com/portal',
        userId: 'student-user-42',
      },
      browserSessionId: testSessionId,
      challenge,
      prisma: mockPrisma,
      screenshotService,
    });

    expect(handoff.isPausedForUser).toBe(true);
    expect(handoff.challengeType).toBe('CAPTCHA');
    expect(handoff.screenshotPath).toBeDefined();

    // Verify session updated to PAUSED_FOR_USER
    const updatedSession = browserSessionsTable.get(testSessionId);
    expect(updatedSession?.sessionStatus).toBe('PAUSED_FOR_USER');
    expect(updatedSession?.lastScreenshotUrl).toContain('job-handoff-1');

    // Verify student notification created with ACTION_REQUIRED
    const notification = notificationsTable.find((n) => n.userId === 'student-user-42');
    expect(notification).toBeDefined();
    expect(notification?.type).toBe('ACTION_REQUIRED');
    expect(notification?.title).toContain('Action Required');
    expect(notification?.message).toContain('Google reCAPTCHA');

    await session.cleanup();
  });

  it('processes automation job and cleanly pauses when challenge is detected without failing with uncaught error', async () => {
    const html = encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head><title>External Portal Verification</title></head>
        <body>
          <h1>Login Required</h1>
          <form action="/login">
            <input type="password" name="user_password" />
          </form>
        </body>
      </html>
    `);
    const targetUrl = `data:text/html;charset=utf-8,${html}`;

    const result = await processBrowserAutomationJob(
      {
        jobId: 'job-portal-login-wall',
        type: 'EXTRACT_FORM',
        targetUrl,
        userId: 'student-user-99',
      },
      mockPrisma,
      browserPool,
      screenshotService,
      undefined,
      challengeDetector,
      handoffService
    );

    // Automation cleanly pauses for student handoff
    expect(result.success).toBe(false);
    expect(result.isPausedForUser).toBe(true);
    expect(result.challengeType).toBe('LOGIN_REQUIRED');
    expect(result.pauseReason).toContain('requires user authentication');
    expect(result.screenshotPath).toBeDefined();
  });
});
