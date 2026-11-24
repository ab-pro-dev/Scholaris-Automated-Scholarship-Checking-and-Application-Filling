import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPool } from '../src/browser/browser-pool.js';
import { ScreenshotService } from '../src/storage/screenshot.service.js';
import { FormDetectorService } from '../src/detector/form-detector.service.js';
import { processBrowserAutomationJob } from '../src/queue/automation.worker.js';
import { PrismaClient } from '@scholaris/database';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('FormDetectorService & DOM Analysis Engine (TASK-022)', () => {
  const browserPool = new BrowserPool();
  const testScreenshotsDir = path.join(process.cwd(), 'test-detector-screenshots');
  const screenshotService = new ScreenshotService(testScreenshotsDir);

  // In-memory mock Prisma store
  const applicationFieldsTable: any[] = [];
  const automationJobsTable = new Map<string, any>();
  const browserSessionsTable = new Map<string, any>();

  const mockPrisma = {
    $transaction: async (fn: any) => {
      const txMock = {
        applicationField: {
          deleteMany: async ({ where }: any) => {
            const initialLen = applicationFieldsTable.length;
            const remaining = applicationFieldsTable.filter((f) => f.applicationId !== where.applicationId);
            applicationFieldsTable.length = 0;
            applicationFieldsTable.push(...remaining);
            return { count: initialLen - remaining.length };
          },
          create: async ({ data }: any) => {
            const record = { id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...data };
            applicationFieldsTable.push(record);
            return record;
          },
        },
      };
      return fn(txMock);
    },
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

  it('accurately identifies input elements, classifies field types, and resolves semantic labels', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    const detector = new FormDetectorService();

    await session.page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Chevening Scholarship Portal</title></head>
        <body>
          <h1 class="portal-title">Chevening Application Portal</h1>
          <form id="scholarship-form">
            <!-- 1. Explicit label for text input with required asterisk -->
            <label for="first_name">Given Name *</label>
            <input type="text" id="first_name" name="first_name" required />

            <!-- 2. Parent wrapping label for email -->
            <label>
              Email Address
              <input type="email" id="email_addr" name="email_addr" placeholder="you@example.com" />
            </label>

            <!-- 3. Textarea with aria-label -->
            <textarea id="personal_statement" name="personal_statement" aria-label="Personal Statement Essay" rows="5"></textarea>

            <!-- 4. Select dropdown with options -->
            <label for="degree_level">Target Degree Level</label>
            <select id="degree_level" name="degree_level">
              <option value="">-- Select Degree --</option>
              <option value="masters">Master of Science / MA</option>
              <option value="phd">PhD / Doctorate</option>
            </select>

            <!-- 5. Fieldset with Radio group -->
            <fieldset>
              <legend>Do you require visa sponsorship?</legend>
              <label><input type="radio" name="visa_needed" value="yes" /> Yes</label>
              <label><input type="radio" name="visa_needed" value="no" /> No</label>
            </fieldset>

            <!-- 6. Checkbox with sibling label -->
            <label for="terms_agreed">
              <input type="checkbox" id="terms_agreed" name="terms_agreed" aria-required="true" />
              I certify that all statements are true *
            </label>

            <!-- 7. File upload input -->
            <label for="transcript_pdf">Academic Transcript (PDF)</label>
            <input type="file" id="transcript_pdf" name="transcript_pdf" accept=".pdf" />

            <!-- 8. Date input -->
            <label for="dob">Date of Birth</label>
            <input type="date" id="dob" name="dob" />

            <!-- Ignored controls: button, submit, hidden -->
            <input type="hidden" name="csrf_token" value="xyz987" />
            <button type="submit">Submit Application</button>
          </form>
        </body>
      </html>
    `);

    const result = await detector.detectFormFields(session.page);

    expect(result.formTitle).toBe('Chevening Application Portal');
    expect(result.totalFieldsCount).toBe(8); // text, email, textarea, select, radio group, checkbox, file, date
    expect(result.requiredFieldsCount).toBeGreaterThanOrEqual(2);

    // Verify individual field classifications
    const fieldMap = new Map(result.fields.map((f) => [f.fieldKey, f]));

    // Given Name
    const firstName = fieldMap.get('first_name');
    expect(firstName).toBeDefined();
    expect(firstName?.fieldType).toBe('TEXT');
    expect(firstName?.label).toBe('Given Name');
    expect(firstName?.isRequired).toBe(true);

    // Email
    const email = fieldMap.get('email_addr');
    expect(email).toBeDefined();
    expect(email?.fieldType).toBe('TEXT');
    expect(email?.label).toBe('Email Address');
    expect(email?.placeholder).toBe('you@example.com');

    // Textarea
    const statement = fieldMap.get('personal_statement');
    expect(statement).toBeDefined();
    expect(statement?.fieldType).toBe('TEXTAREA');
    expect(statement?.label).toBe('Personal Statement Essay');

    // Select
    const degree = fieldMap.get('degree_level');
    expect(degree).toBeDefined();
    expect(degree?.fieldType).toBe('SELECT');
    expect(degree?.label).toBe('Target Degree Level');
    expect(degree?.options).toEqual(['Master of Science / MA', 'PhD / Doctorate']);

    // Radio
    const visa = fieldMap.get('visa_needed');
    expect(visa).toBeDefined();
    expect(visa?.fieldType).toBe('RADIO');
    expect(visa?.options?.length).toBe(2);

    // Checkbox
    const terms = fieldMap.get('terms_agreed');
    expect(terms).toBeDefined();
    expect(terms?.fieldType).toBe('CHECKBOX');
    expect(terms?.isRequired).toBe(true);

    // File
    const transcript = fieldMap.get('transcript_pdf');
    expect(transcript).toBeDefined();
    expect(transcript?.fieldType).toBe('FILE');
    expect(transcript?.label).toBe('Academic Transcript (PDF)');

    // Date
    const dob = fieldMap.get('dob');
    expect(dob).toBeDefined();
    expect(dob?.fieldType).toBe('DATE');
    expect(dob?.label).toBe('Date of Birth');

    await session.cleanup();
  });

  it('detects multi-step wizard pagination indicators and step counts', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    const detector = new FormDetectorService();

    await session.page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div class="wizard-header">
            <span class="step-indicator">Step 2 of 5: Academic Qualifications</span>
          </div>
          <form>
            <label for="undergrad_gpa">Undergraduate GPA</label>
            <input type="text" id="undergrad_gpa" name="undergrad_gpa" required />
          </form>
        </body>
      </html>
    `);

    const result = await detector.detectFormFields(session.page, { currentPageNumber: 2 });

    expect(result.hasMultiPageWizard).toBe(true);
    expect(result.estimatedPages).toBe(5);
    expect(result.fields[0].pageNumber).toBe(2);
    expect(result.fields[0].isRequired).toBe(true);

    await session.cleanup();
  });

  it('persists extracted form fields into PostgreSQL ApplicationField records via detectAndPersist', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    const detector = new FormDetectorService(mockPrisma);
    const testAppId = 'app-test-uuid-42';

    await session.page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <form>
            <label for="major">Intended Major</label>
            <input type="text" id="major" name="major" required />

            <label for="research_summary">Research Summary</label>
            <textarea id="research_summary" name="research_summary"></textarea>
          </form>
        </body>
      </html>
    `);

    const result = await detector.detectAndPersist(session.page, testAppId);

    expect(result.totalFieldsCount).toBe(2);
    expect(applicationFieldsTable.length).toBe(2);

    const savedMajor = applicationFieldsTable.find((f) => f.fieldKey === 'major');
    expect(savedMajor).toBeDefined();
    expect(savedMajor?.applicationId).toBe(testAppId);
    expect(savedMajor?.label).toBe('Intended Major');
    expect(savedMajor?.fieldType).toBe('TEXT');
    expect(savedMajor?.isRequired).toBe(true);

    // Call detectAndPersist again with updated form to verify transactional deduplication/replacement
    await session.page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <form>
            <label for="major">Field of Study</label>
            <input type="text" id="major" name="major" />
          </form>
        </body>
      </html>
    `);

    const updatedResult = await detector.detectAndPersist(session.page, testAppId);
    expect(updatedResult.totalFieldsCount).toBe(1);
    expect(applicationFieldsTable.filter((f) => f.applicationId === testAppId).length).toBe(1);

    await session.cleanup();
  });

  it('processes EXTRACT_FORM job through BullMQ worker pipeline', async () => {
    const html = encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head><title>Fulbright Foreign Student Program</title></head>
        <body>
          <h1>Fulbright Application</h1>
          <form>
            <label for="applicant_name">Full Name *</label>
            <input type="text" id="applicant_name" name="applicant_name" required />
            <label for="bio">Biography</label>
            <textarea id="bio" name="bio"></textarea>
          </form>
        </body>
      </html>
    `);
    const targetUrl = `data:text/html;charset=utf-8,${html}`;
    const testAppId = 'app-fulbright-99';

    const result = await processBrowserAutomationJob(
      {
        jobId: 'job-extract-1',
        applicationId: testAppId,
        type: 'EXTRACT_FORM',
        targetUrl,
        userId: 'user-fulbright-1',
      },
      mockPrisma,
      browserPool,
      screenshotService
    );

    expect(result.success).toBe(true);
    expect(result.pageTitle).toBe('Fulbright Foreign Student Program');
    expect(result.detectedFieldsCount).toBe(2);
    expect(result.screenshotPath).toBeDefined();

    // Verify fields were saved in the mock database
    const saved = applicationFieldsTable.filter((f) => f.applicationId === testAppId);
    expect(saved.length).toBe(2);
    expect(saved.find((f) => f.fieldKey === 'applicant_name')?.isRequired).toBe(true);

    // Verify job status updated in DB
    const jobRecord = automationJobsTable.get('job-extract-1');
    expect(jobRecord?.status).toBe('COMPLETED');
  });
});
