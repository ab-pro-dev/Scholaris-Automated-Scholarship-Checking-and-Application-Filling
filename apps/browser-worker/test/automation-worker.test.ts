import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPool } from '../src/browser/browser-pool.js';
import { ScreenshotService } from '../src/storage/screenshot.service.js';
import { processBrowserAutomationJob } from '../src/queue/automation.worker.js';
import { PrismaClient } from '@scholaris/database';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('Browser Automation Worker Pipeline (TASK-021)', () => {
  const browserPool = new BrowserPool();
  const testScreenshotsDir = path.join(process.cwd(), 'test-worker-screenshots');
  const screenshotService = new ScreenshotService(testScreenshotsDir);

  // In-memory mock database
  const automationJobsTable = new Map<string, any>();
  const browserSessionsTable = new Map<string, any>();

  const mockPrisma = {
    automationJob: {
      update: async ({ where, data }: any) => {
        const existing = automationJobsTable.get(where.id) || {};
        const updated = { ...existing, ...data };
        automationJobsTable.set(where.id, updated);
        return updated;
      },
    },
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
    },
  } as unknown as PrismaClient;

  afterAll(async () => {
    await browserPool.close();
    try {
      await fs.rm(testScreenshotsDir, { recursive: true, force: true });
    } catch {}
  });

  it('processes VERIFY_URL automation job, capturing title and progress screenshot', async () => {
    // Generate valid data URL with HTML test page
    const html = encodeURIComponent(`
      <html>
        <head><title>DAAD Helmut-Schmidt Portal</title></head>
        <body><h1>DAAD Scholarship Application</h1></body>
      </html>
    `);
    const targetUrl = `data:text/html;charset=utf-8,${html}`;

    const result = await processBrowserAutomationJob(
      {
        jobId: 'job-verify-1',
        type: 'VERIFY_URL',
        targetUrl,
        userId: 'user-student-1',
      },
      mockPrisma,
      browserPool,
      screenshotService
    );

    expect(result.success).toBe(true);
    expect(result.pageTitle).toBe('DAAD Helmut-Schmidt Portal');
    expect(result.screenshotPath).toBeDefined();

    // Verify database job status updated to COMPLETED
    const jobRecord = automationJobsTable.get('job-verify-1');
    expect(jobRecord?.status).toBe('COMPLETED');
  });

  it('processes FILL_FORM automation job and detects input fields', async () => {
    const html = encodeURIComponent(`
      <html>
        <head><title>Gates Cambridge Application</title></head>
        <body>
          <form>
            <input type="text" id="first_name" name="first_name" />
            <input type="text" id="last_name" name="last_name" />
            <input type="text" id="gpa" name="gpa" />
          </form>
        </body>
      </html>
    `);
    const targetUrl = `data:text/html;charset=utf-8,${html}`;

    const result = await processBrowserAutomationJob(
      {
        jobId: 'job-fill-1',
        type: 'FILL_FORM',
        targetUrl,
        userId: 'user-student-1',
        fieldValues: {
          first_name: 'Ada',
          last_name: 'Lovelace',
          gpa: '3.95',
        },
      },
      mockPrisma,
      browserPool,
      screenshotService
    );

    expect(result.success).toBe(true);
    expect(result.detectedFieldsCount).toBe(3);
    expect(result.filledFieldsCount).toBe(3);
    expect(result.screenshotPath).toBeDefined();
  });

  it('strictly blocks SUBMIT_APPLICATION job when user approval is missing (Mandatory Safety Rule)', async () => {
    const html = encodeURIComponent(`
      <html>
        <head><title>Submission Page</title></head>
        <body><button type="submit">Submit Application</button></body>
      </html>
    `);
    const targetUrl = `data:text/html;charset=utf-8,${html}`;

    const result = await processBrowserAutomationJob(
      {
        jobId: 'job-submit-unapproved',
        type: 'SUBMIT_APPLICATION',
        targetUrl,
        userId: 'user-student-1',
        userApproved: false, // NOT approved
      },
      mockPrisma,
      browserPool,
      screenshotService
    );

    // Job should fail safely
    expect(result.success).toBe(false);
    expect(result.error).toContain('Explicit student authorization required before submitting');

    // Emergency screenshot should be captured for audit inspection
    expect(result.screenshotPath).toBeDefined();

    // Database job status marked as FAILED
    const jobRecord = automationJobsTable.get('job-submit-unapproved');
    expect(jobRecord?.status).toBe('FAILED');
  });
});
