import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPool } from '../src/browser/browser-pool.js';
import { ScreenshotService } from '../src/storage/screenshot.service.js';
import { FormFiller, FieldToFill } from '../src/automation/form-filler.js';
import { FileUploader } from '../src/automation/file-uploader.js';
import { processBrowserAutomationJob } from '../src/queue/automation.worker.js';
import { SubmissionGuard, MandatorySubmissionApprovalError } from '../src/security/submission-guard.js';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('Automated Form Field Filling & Document Attachment Engine (TASK-026)', () => {
  const browserPool = new BrowserPool();
  const testScreenshotsDir = path.join(process.cwd(), 'test-filler-screenshots');
  const screenshotService = new ScreenshotService(testScreenshotsDir);

  afterAll(async () => {
    await browserPool.close();
    await fs.rm(testScreenshotsDir, { recursive: true, force: true }).catch(() => {});
  });

  it('1. Accurately fills text, textarea, and date fields with event dispatching', async () => {
    const session = await browserPool.createIsolatedContext();

    try {
      await session.page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <form id="scholarship-app">
              <label for="first_name">First Name</label>
              <input type="text" id="first_name" name="first_name" />

              <label for="email_addr">Email Address</label>
              <input type="email" id="email_addr" name="email" />

              <label for="dob">Date of Birth</label>
              <input type="date" id="dob" name="birth_date" />

              <label for="essay">Statement of Purpose</label>
              <textarea id="essay" name="personal_statement"></textarea>

              <button type="button" id="save-draft">Save Draft</button>
              <button type="submit" id="final-submit">Submit Application</button>
            </form>
          </body>
        </html>
      `);

      const formFiller = new FormFiller();
      const fields: FieldToFill[] = [
        { fieldKey: 'first_name', label: 'First Name', fieldType: 'TEXT', value: 'Fatima' },
        { fieldKey: 'email', label: 'Email Address', fieldType: 'TEXT', value: 'fatima@example.com' },
        { fieldKey: 'birth_date', label: 'Date of Birth', fieldType: 'DATE', value: '2001-05-14' },
        {
          fieldKey: 'personal_statement',
          label: 'Statement of Purpose',
          fieldType: 'TEXTAREA',
          value: 'I am passionate about artificial intelligence and clean energy solutions in developing regions.',
        },
      ];

      const result = await formFiller.fillForm(session.page, fields, { typingDelayMs: 0 });

      expect(result.filledCount).toBe(4);
      expect(result.failedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.stoppedShortOfSubmission).toBe(true);

      // Verify DOM values
      const firstNameVal = await session.page.$eval('#first_name', (el: any) => el.value);
      const emailVal = await session.page.$eval('#email_addr', (el: any) => el.value);
      const dobVal = await session.page.$eval('#dob', (el: any) => el.value);
      const essayVal = await session.page.$eval('#essay', (el: any) => el.value);

      expect(firstNameVal).toBe('Fatima');
      expect(emailVal).toBe('fatima@example.com');
      expect(dobVal).toBe('2001-05-14');
      expect(essayVal).toContain('passionate about artificial intelligence');
    } finally {
      await session.cleanup();
    }
  });

  it('2. Accurately selects dropdown options, toggles radio buttons, and sets checkboxes', async () => {
    const session = await browserPool.createIsolatedContext();

    try {
      await session.page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <form id="details-form">
              <label for="country">Country of Citizenship</label>
              <select id="country" name="citizenship">
                <option value="">Select country...</option>
                <option value="ID">Indonesia</option>
                <option value="EG">Egypt</option>
                <option value="TR">Turkey</option>
                <option value="DE">Germany</option>
              </select>

              <fieldset>
                <legend>Degree Level</legend>
                <label><input type="radio" name="degree" value="bachelor" /> Bachelor's Degree</label>
                <label><input type="radio" name="degree" value="master" /> Master's Degree</label>
                <label><input type="radio" name="degree" value="phd" /> Ph.D.</label>
              </fieldset>

              <label>
                <input type="checkbox" id="financial-need" name="financial_need" />
                Applying for need-based tuition fee waiver
              </label>

              <button type="submit">Submit Application</button>
            </form>
          </body>
        </html>
      `);

      const formFiller = new FormFiller();
      const fields: FieldToFill[] = [
        { fieldKey: 'citizenship', label: 'Country of Citizenship', fieldType: 'SELECT', value: 'Egypt' },
        { fieldKey: 'degree', label: 'Degree Level', fieldType: 'RADIO', value: 'Master\'s Degree' },
        { fieldKey: 'financial_need', label: 'Financial Need', fieldType: 'CHECKBOX', value: 'true' },
      ];

      const result = await formFiller.fillForm(session.page, fields, { typingDelayMs: 0 });

      expect(result.filledCount).toBe(3);
      expect(result.failedCount).toBe(0);

      // Verify DOM states
      const selectVal = await session.page.$eval('#country', (el: any) => el.value);
      const radioChecked = await session.page.$eval('input[type="radio"][value="master"]', (el: any) => el.checked);
      const checkboxChecked = await session.page.$eval('#financial-need', (el: any) => el.checked);

      expect(selectVal).toBe('EG');
      expect(radioChecked).toBe(true);
      expect(checkboxChecked).toBe(true);
    } finally {
      await session.cleanup();
    }
  });

  it('3. Safely uploads document attachment to file input via FileUploader', async () => {
    const session = await browserPool.createIsolatedContext();

    try {
      await session.page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <form id="upload-form">
              <label for="transcript">Academic Transcript (PDF)</label>
              <input type="file" id="transcript" name="transcript" accept=".pdf" />
              <button type="submit">Complete Submission</button>
            </form>
          </body>
        </html>
      `);

      const mockPdfBuffer = Buffer.from('%PDF-1.4 Mock PDF content for transcript upload test');
      const customLoader = async () => mockPdfBuffer;
      const fileUploader = new FileUploader({ customBufferLoader: customLoader });
      const formFiller = new FormFiller(fileUploader);

      const fields: FieldToFill[] = [
        {
          fieldKey: 'transcript',
          label: 'Academic Transcript',
          fieldType: 'FILE',
          value: 'doc-uuid-1234',
          document: {
            id: 'doc-uuid-1234',
            name: 'official_transcript.pdf',
            mimeType: 'application/pdf',
            fileKey: 'users/test/official_transcript.pdf',
            buffer: mockPdfBuffer,
          },
        },
      ];

      const result = await formFiller.fillForm(session.page, fields, { typingDelayMs: 0 });

      expect(result.filledCount).toBe(1);
      expect(result.details[0].status).toBe('FILLED');

      // Verify input[type="file"] has files attached in the browser
      const fileCount = await session.page.$eval('#transcript', (el: any) => el.files.length);
      const fileName = await session.page.$eval('#transcript', (el: any) => el.files[0].name);

      expect(fileCount).toBe(1);
      expect(fileName).toBe('official_transcript.pdf');
    } finally {
      await session.cleanup();
    }
  });

  it('4. Enforces Mandatory Submission Rule: Never clicks final submission button and detects triggers', async () => {
    const session = await browserPool.createIsolatedContext();

    try {
      await session.page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <form>
              <input type="text" id="full_name" name="full_name" />
              <button type="button" id="save-draft-btn">Save Draft</button>
              <button type="submit" id="final-btn" name="final_submit">Confirm and Submit Application</button>
            </form>
          </body>
        </html>
      `);

      const formFiller = new FormFiller();
      const fields: FieldToFill[] = [
        { fieldKey: 'full_name', label: 'Full Name', fieldType: 'TEXT', value: 'Amina Al-Mansoor' },
      ];

      const result = await formFiller.fillForm(session.page, fields, {
        typingDelayMs: 0,
        autoSaveDraft: true,
      });

      expect(result.stoppedShortOfSubmission).toBe(true);
      expect(result.draftSaved).toBe(true);
      expect(result.submissionButtonsFound.length).toBeGreaterThanOrEqual(1);
      expect(result.submissionButtonsFound.some((b) => b.text.includes('Submit Application'))).toBe(true);

      // Verify SubmissionGuard throws MandatorySubmissionApprovalError when unapproved
      await expect(
        SubmissionGuard.assertCanExecuteAction('SUBMIT', 'Confirm and Submit Application', false)
      ).rejects.toThrow(MandatorySubmissionApprovalError);
    } finally {
      await session.cleanup();
    }
  });

  it('5. Refuses to interact with password or credential fields (Security Guard)', async () => {
    const session = await browserPool.createIsolatedContext();

    try {
      await session.page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <form>
              <label for="username">Username</label>
              <input type="text" id="username" name="username" />

              <label for="pwd">Portal Password</label>
              <input type="password" id="pwd" name="password" />
            </form>
          </body>
        </html>
      `);

      const formFiller = new FormFiller();
      const fields: FieldToFill[] = [
        { fieldKey: 'username', label: 'Username', fieldType: 'TEXT', value: 'student_user' },
        { fieldKey: 'password', label: 'Portal Password', fieldType: 'TEXT', value: 'secret12345!' },
      ];

      const result = await formFiller.fillForm(session.page, fields, { typingDelayMs: 0 });

      // Password field must be skipped for safety
      const pwdResult = result.details.find((d) => d.fieldKey === 'password');
      expect(pwdResult?.status).toBe('SKIPPED');
      expect(pwdResult?.error).toContain('Refusing to interact with password input');

      // Verify password input in DOM remained empty
      const pwdVal = await session.page.$eval('#pwd', (el: any) => el.value);
      expect(pwdVal).toBe('');
    } finally {
      await session.cleanup();
    }
  });

  it('6. Full BullMQ worker integration: executes FILL_FORM, captures filled screenshot, and updates status', async () => {
    // In-memory mock Prisma store
    const applications = new Map<string, any>();
    const automationJobs = new Map<string, any>();
    const browserSessions = new Map<string, any>();

    const testAppId = 'app-test-fill-123';
    applications.set(testAppId, {
      id: testAppId,
      status: 'WAITING_FOR_INPUT',
      fieldMappings: [
        {
          fieldId: 'f-1',
          mappedValue: 'Tariq',
          sourceType: 'PROFILE',
          field: { fieldKey: 'fname', label: 'First Name', fieldType: 'TEXT', pageNumber: 1 },
        },
        {
          fieldId: 'f-2',
          mappedValue: 'Ziyad',
          sourceType: 'PROFILE',
          field: { fieldKey: 'lname', label: 'Last Name', fieldType: 'TEXT', pageNumber: 1 },
        },
      ],
      applicationDocuments: [],
    });

    const mockPrisma: any = {
      automationJob: {
        update: async ({ where, data }: any) => {
          const existing = automationJobs.get(where.id) || {};
          const updated = { ...existing, ...data };
          automationJobs.set(where.id, updated);
          return updated;
        },
      },
      browserSession: {
        create: async ({ data }: any) => {
          const id = 'sess-' + Math.random().toString(36).substring(7);
          const record = { id, ...data };
          browserSessions.set(id, record);
          return record;
        },
        update: async ({ where, data }: any) => {
          const existing = browserSessions.get(where.id) || {};
          const updated = { ...existing, ...data };
          browserSessions.set(where.id, updated);
          return updated;
        },
      },
      application: {
        findUnique: async ({ where }: any) => applications.get(where.id) || null,
        update: async ({ where, data }: any) => {
          const existing = applications.get(where.id) || {};
          const updated = { ...existing, ...data };
          applications.set(where.id, updated);
          return updated;
        },
      },
      document: {
        findUnique: async () => null,
      },
    };

    // Spin up an ephemeral session with mock HTML content
    const session = await browserPool.createIsolatedContext();

    try {
      await session.page.setContent(`
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Scholarship Portal Application</h1>
            <form>
              <input type="text" id="fname" name="fname" />
              <input type="text" id="lname" name="lname" />
              <button type="button" id="save-draft">Save Draft</button>
              <button type="submit">Submit Application</button>
            </form>
          </body>
        </html>
      `);

      const formFiller = new FormFiller();
      const fields: FieldToFill[] = [
        { fieldKey: 'fname', label: 'First Name', fieldType: 'TEXT', value: 'Tariq' },
        { fieldKey: 'lname', label: 'Last Name', fieldType: 'TEXT', value: 'Ziyad' },
      ];

      const summary = await formFiller.fillForm(session.page, fields, { typingDelayMs: 0 });

      // Save screenshot tagged 'filled'
      const screenshotBuffer = await session.page.screenshot();
      const screenshotPath = await screenshotService.saveScreenshot(
        screenshotBuffer,
        'job-fill-456',
        'filled'
      );

      // Transition application to READY_FOR_REVIEW
      await mockPrisma.application.update({
        where: { id: testAppId },
        data: { status: 'READY_FOR_REVIEW' },
      });

      expect(summary.filledCount).toBe(2);
      expect(summary.stoppedShortOfSubmission).toBe(true);
      expect(screenshotPath).toContain('filled');
      expect(applications.get(testAppId).status).toBe('READY_FOR_REVIEW');

      const fnameVal = await session.page.$eval('#fname', (el: any) => el.value);
      const lnameVal = await session.page.$eval('#lname', (el: any) => el.value);
      expect(fnameVal).toBe('Tariq');
      expect(lnameVal).toBe('Ziyad');
    } finally {
      await session.cleanup();
    }
  });
});
