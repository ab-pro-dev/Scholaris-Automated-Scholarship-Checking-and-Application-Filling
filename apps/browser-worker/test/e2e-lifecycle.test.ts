import { describe, it, expect, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { BrowserPool } from '../src/browser/browser-pool.js';
import { ScreenshotService } from '../src/storage/screenshot.service.js';
import { FormDetectorService } from '../src/detector/form-detector.service.js';
import { FormFiller, FieldToFill } from '../src/automation/form-filler.js';
import { FileUploader } from '../src/automation/file-uploader.js';
import { SubmissionGuard, MandatorySubmissionApprovalError } from '../src/security/submission-guard.js';

const MOCK_PORTAL_HTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Global STEM Fellowship — Official Portal</title>
  </head>
  <body>
    <main>
      <h1>Global STEM Fellowship Application</h1>
      <form id="fellowship-form">
        <label for="full_name">Full Legal Name</label>
        <input type="text" id="full_name" name="full_name" required />

        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required />

        <label for="dob">Date of Birth</label>
        <input type="date" id="dob" name="dob" required />

        <label for="degree_program">Degree Program</label>
        <select id="degree_program" name="degree_program" required>
          <option value="">Select program...</option>
          <option value="msc_cs">MSc Computer Science</option>
          <option value="msc_ai">MSc Artificial Intelligence</option>
        </select>

        <fieldset>
          <legend>Funding Track</legend>
          <label><input type="radio" name="funding_track" value="FULL" /> Full Tuition + Stipend</label>
          <label><input type="radio" name="funding_track" value="TUITION" /> Tuition Only</label>
        </fieldset>

        <label for="motivation">Motivation Statement</label>
        <textarea id="motivation" name="motivation" required></textarea>

        <label for="transcript_pdf">Official Transcript (PDF)</label>
        <input type="file" id="transcript_pdf" name="transcript_pdf" accept=".pdf" required />

        <label>
          <input type="checkbox" id="terms_agree" name="terms_agree" required />
          I certify all information is accurate
        </label>

        <button type="button" id="save-draft">Save Draft</button>
        <button type="submit" id="final-submit">Submit Application</button>
      </form>

      <div id="draft-status" style="display:none;">Draft saved</div>
      <section id="confirmation-banner" role="alert" style="display:none;">
        <h2>Application Submitted Successfully</h2>
        <p>Confirmation Reference: <strong>SCH-2026-E2E</strong></p>
      </section>
    </main>

    <script>
      document.getElementById('save-draft').addEventListener('click', () => {
        document.getElementById('draft-status').style.display = 'block';
      });
      document.getElementById('fellowship-form').addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('fellowship-form').style.display = 'none';
        document.getElementById('confirmation-banner').style.display = 'block';
      });
    </script>
  </body>
</html>
`;

describe('E2E Browser Automation Lifecycle on Mock Scholarship Portal (TASK-031)', () => {
  const browserPool = new BrowserPool();
  const screenshotsDir = path.join(process.cwd(), 'test-e2e-screenshots');
  const screenshotService = new ScreenshotService(screenshotsDir);

  afterAll(async () => {
    await browserPool.close();
    await fs.rm(screenshotsDir, { recursive: true, force: true }).catch(() => {});
  });

  it('executes full lifecycle: form detection -> filling & PDF upload -> approval gate -> final submission & proof capture', async () => {
    const session = await browserPool.createIsolatedContext();

    try {
      await session.page.setContent(MOCK_PORTAL_HTML);

      // 1. Detect all multi-type form controls
      const detector = new FormDetectorService({} as any);
      const detection = await detector.detectFormFields(session.page, {
        currentPageNumber: 1,
        waitForSelectors: false,
      });

      expect(detection.fields.length).toBeGreaterThanOrEqual(7);
      const keys = detection.fields.map((f) => f.fieldKey);
      expect(keys).toContain('full_name');
      expect(keys).toContain('degree_program');
      expect(keys).toContain('motivation');
      expect(keys).toContain('transcript_pdf');

      // 2. Fill text, email, date, select, radio, checkbox, textarea, and FILE fields
      const pdfBytes = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
      );
      const fileUploader = new FileUploader({
        customBufferLoader: async () => pdfBytes,
      });
      const formFiller = new FormFiller(fileUploader);
      const fieldsToFill: FieldToFill[] = [
        { fieldKey: 'full_name', label: 'Full Legal Name', fieldType: 'TEXT', value: 'Amina Hassan' },
        { fieldKey: 'email', label: 'Email Address', fieldType: 'TEXT', value: 'amina@scholaris.test' },
        { fieldKey: 'dob', label: 'Date of Birth', fieldType: 'DATE', value: '2002-09-10' },
        { fieldKey: 'degree_program', label: 'Degree Program', fieldType: 'SELECT', value: 'MSc Artificial Intelligence' },
        { fieldKey: 'funding_track', label: 'Funding Track', fieldType: 'RADIO', value: 'FULL' },
        {
          fieldKey: 'motivation',
          label: 'Motivation Statement',
          fieldType: 'TEXTAREA',
          value: 'Researching reliable machine learning systems for medical diagnostics.',
        },
        {
          fieldKey: 'transcript_pdf',
          label: 'Official Transcript (PDF)',
          fieldType: 'FILE',
          value: 'doc-e2e-1',
          document: {
            id: 'doc-e2e-1',
            name: 'official-transcript.pdf',
            mimeType: 'application/pdf',
            fileKey: 'users/e2e/official-transcript.pdf',
            buffer: pdfBytes,
          },
        },
        { fieldKey: 'terms_agree', label: 'I certify all information is accurate', fieldType: 'CHECKBOX', value: 'true' },
      ];

      const fillSummary = await formFiller.fillForm(session.page, fieldsToFill, { typingDelayMs: 0 });
      expect(fillSummary.filledCount).toBe(8);
      expect(fillSummary.stoppedShortOfSubmission).toBe(true);

      const uploadedFileName = await session.page.$eval(
        '#transcript_pdf',
        (el: any) => el.files?.[0]?.name || ''
      );
      expect(uploadedFileName).toBe('official-transcript.pdf');

      // Verify pre-submission screenshot & that confirmation banner is NOT visible yet
      const filledShot = await screenshotService.saveScreenshot(
        await session.page.screenshot(),
        'e2e-job-1',
        'filled'
      );
      expect(filledShot).toContain('filled');
      const bannerBeforeApproval = await session.page.isVisible('#confirmation-banner');
      expect(bannerBeforeApproval).toBe(false);

      // 4. Mandatory Submission Rule: submission MUST be blocked when userApproved is false
      await expect(
        SubmissionGuard.assertCanExecuteAction('SUBMIT', '#final-submit', false, null)
      ).rejects.toThrow(MandatorySubmissionApprovalError);

      // 5. Explicit user approval granted -> execute final submit & capture proof
      await expect(
        SubmissionGuard.assertCanExecuteAction('SUBMIT', '#final-submit', true, new Date())
      ).resolves.toBeUndefined();

      await session.page.click('#final-submit');
      await session.page.waitForSelector('#confirmation-banner', { state: 'visible', timeout: 3000 });

      const confirmationText = await session.page.textContent('#confirmation-banner');
      expect(confirmationText).toContain('Application Submitted Successfully');
      expect(confirmationText).toContain('SCH-2026-E2E');

      const proofShot = await screenshotService.saveScreenshot(
        await session.page.screenshot(),
        'e2e-job-1',
        'submission-proof'
      );
      expect(proofShot).toContain('submission-proof');
    } finally {
      await session.cleanup();
    }
  }, 30000);
});
