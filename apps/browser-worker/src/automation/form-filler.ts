import { Page, Locator } from 'playwright';
import { FieldType } from '@scholaris/database';
import { FileUploader, DocumentPayload } from './file-uploader.js';
import { SubmissionGuard, MandatorySubmissionApprovalError } from '../security/submission-guard.js';

export interface FieldToFill {
  fieldId?: string;
  fieldKey: string;
  label: string;
  fieldType: FieldType | string;
  value: string;
  options?: string[] | null;
  pageNumber?: number;
  document?: DocumentPayload | null;
}

export interface FormFillerOptions {
  typingDelayMs?: number;
  autoSaveDraft?: boolean;
  handlePagination?: boolean;
  maxPages?: number;
}

export interface FieldFillResult {
  fieldKey: string;
  label: string;
  fieldType: string;
  value: string;
  status: 'FILLED' | 'FAILED' | 'SKIPPED';
  selectorUsed?: string;
  error?: string;
}

export interface FormFillingSummary {
  totalMapped: number;
  filledCount: number;
  failedCount: number;
  skippedCount: number;
  details: FieldFillResult[];
  draftSaved: boolean;
  stoppedShortOfSubmission: boolean;
  submissionButtonsFound: Array<{ text: string; selector: string }>;
}

export class FormFiller {
  private fileUploader: FileUploader;

  constructor(fileUploader?: FileUploader) {
    this.fileUploader = fileUploader || new FileUploader();
  }

  /**
   * Main entrypoint: fills all provided fields on the given Playwright Page.
   */
  async fillForm(
    page: Page,
    fields: FieldToFill[],
    options: FormFillerOptions = {}
  ): Promise<FormFillingSummary> {
    const {
      typingDelayMs = 0,
      autoSaveDraft = true,
      handlePagination = false,
      maxPages = 5,
    } = options;

    const details: FieldFillResult[] = [];
    let filledCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages && currentPage <= maxPages) {
      // Filter fields for current page (or all if not paginated)
      const pageFields = fields.filter((f) => !f.pageNumber || f.pageNumber === currentPage);

      for (const field of pageFields) {
        // Skip already processed fields
        if (details.some((d) => d.fieldKey === field.fieldKey && d.status === 'FILLED')) {
          continue;
        }

        // Invariant: empty or unconfirmed values are skipped to prevent hallucinated data
        if (!field.value && !field.document) {
          details.push({
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: String(field.fieldType),
            value: '',
            status: 'SKIPPED',
            error: 'No mapped value or document provided',
          });
          skippedCount++;
          continue;
        }

        const result = await this.fillSingleField(page, field, typingDelayMs);
        details.push(result);

        if (result.status === 'FILLED') {
          filledCount++;
        } else if (result.status === 'FAILED') {
          failedCount++;
        } else {
          skippedCount++;
        }
      }

      // Check if multi-page wizard navigation is required
      if (handlePagination) {
        const canAdvance = await this.advanceWizardPage(page);
        if (canAdvance) {
          currentPage++;
          await page.waitForLoadState('domcontentloaded').catch(() => {});
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }

    // Attempt to save draft if portal has draft capability
    let draftSaved = false;
    if (autoSaveDraft) {
      draftSaved = await this.trySaveDraft(page);
    }

    // MANDATORY SUBMISSION RULE ENFORCEMENT:
    // Scan and record final submission triggers, guaranteeing we NEVER trigger them automatically.
    const submissionButtons = await SubmissionGuard.findSubmissionButtons(page);

    return {
      totalMapped: fields.length,
      filledCount,
      failedCount,
      skippedCount,
      details,
      draftSaved,
      stoppedShortOfSubmission: true,
      submissionButtonsFound: submissionButtons,
    };
  }

  /**
   * Dispatches filling logic depending on field type.
   */
  private async fillSingleField(
    page: Page,
    field: FieldToFill,
    typingDelayMs: number
  ): Promise<FieldFillResult> {
    const fieldType = String(field.fieldType).toUpperCase();

    try {
      switch (fieldType) {
        case 'TEXT':
        case 'DATE':
          return await this.fillTextInput(page, field, typingDelayMs);

        case 'TEXTAREA':
          return await this.fillTextarea(page, field, typingDelayMs);

        case 'SELECT':
          return await this.fillSelect(page, field);

        case 'RADIO':
          return await this.fillRadio(page, field);

        case 'CHECKBOX':
          return await this.fillCheckbox(page, field);

        case 'FILE':
          return await this.fillFileInput(page, field);

        default:
          return await this.fillTextInput(page, field, typingDelayMs);
      }
    } catch (err: any) {
      return {
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType,
        value: field.value,
        status: 'FAILED',
        error: err.message,
      };
    }
  }

  /**
   * Resolves locator for standard input elements.
   */
  private getCandidateLocators(page: Page, field: FieldToFill, tag: string = 'input'): Locator[] {
    const locators: Locator[] = [];
    const cleanLabel = (field.label || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();

    // 1. Exact ID
    if (field.fieldKey) {
      locators.push(page.locator(`${tag}#${field.fieldKey}`));
      locators.push(page.locator(`${tag}[name="${field.fieldKey}"]`));
      locators.push(page.locator(`${tag}[id*="${field.fieldKey}"]`));
      locators.push(page.locator(`${tag}[name*="${field.fieldKey}"]`));
    }

    // 2. Semantic label targeting
    if (cleanLabel) {
      locators.push(page.getByLabel(cleanLabel, { exact: false }));
      locators.push(page.locator(`label:has-text("${cleanLabel}") ${tag}`));
      locators.push(page.locator(`${tag}[placeholder*="${cleanLabel}" i]`));
      locators.push(page.locator(`${tag}[aria-label*="${cleanLabel}" i]`));
    }

    return locators;
  }

  /**
   * Fills single-line text / date input with reactive event dispatch.
   */
  private async fillTextInput(
    page: Page,
    field: FieldToFill,
    delayMs: number
  ): Promise<FieldFillResult> {
    const locators = this.getCandidateLocators(page, field, 'input');

    for (const loc of locators) {
      try {
        const count = await loc.count();
        if (count > 0) {
          const el = loc.first();

          // Security check: Refuse password fields
          const inputType = await el.getAttribute('type');
          if (inputType?.toLowerCase() === 'password') {
            return {
              fieldKey: field.fieldKey,
              label: field.label,
              fieldType: 'TEXT',
              value: '******',
              status: 'SKIPPED',
              error: 'Security guard: Refusing to interact with password input.',
            };
          }

          await el.scrollIntoViewIfNeeded().catch(() => {});
          await el.click().catch(() => {});
          await el.fill(field.value);

          // Synthetic event dispatch for reactive SPAs (React, Vue, Angular)
          await el.dispatchEvent('input').catch(() => {});
          await el.dispatchEvent('change').catch(() => {});
          await el.dispatchEvent('blur').catch(() => {});

          if (delayMs > 0) {
            await page.waitForTimeout(delayMs);
          }

          return {
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: 'TEXT',
            value: field.value,
            status: 'FILLED',
            selectorUsed: (await el.getAttribute('name')) || (await el.getAttribute('id')) || 'input',
          };
        }
      } catch {
        continue;
      }
    }

    return {
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: 'TEXT',
      value: field.value,
      status: 'FAILED',
      error: `Could not locate input element for '${field.label}' (${field.fieldKey})`,
    };
  }

  /**
   * Fills multi-line textarea with reactive event dispatch.
   */
  private async fillTextarea(
    page: Page,
    field: FieldToFill,
    delayMs: number
  ): Promise<FieldFillResult> {
    const locators = this.getCandidateLocators(page, field, 'textarea');

    for (const loc of locators) {
      try {
        const count = await loc.count();
        if (count > 0) {
          const el = loc.first();
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await el.click().catch(() => {});
          await el.fill(field.value);

          await el.dispatchEvent('input').catch(() => {});
          await el.dispatchEvent('change').catch(() => {});
          await el.dispatchEvent('blur').catch(() => {});

          if (delayMs > 0) {
            await page.waitForTimeout(delayMs);
          }

          return {
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: 'TEXTAREA',
            value: field.value.length > 50 ? `${field.value.slice(0, 47)}...` : field.value,
            status: 'FILLED',
            selectorUsed: (await el.getAttribute('name')) || (await el.getAttribute('id')) || 'textarea',
          };
        }
      } catch {
        continue;
      }
    }

    return {
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: 'TEXTAREA',
      value: field.value,
      status: 'FAILED',
      error: `Could not locate textarea element for '${field.label}' (${field.fieldKey})`,
    };
  }

  /**
   * Fills <select> dropdown by selecting option by value, label, or index.
   */
  private async fillSelect(page: Page, field: FieldToFill): Promise<FieldFillResult> {
    const locators = this.getCandidateLocators(page, field, 'select');

    for (const loc of locators) {
      try {
        const count = await loc.count();
        if (count > 0) {
          const el = loc.first();
          await el.scrollIntoViewIfNeeded().catch(() => {});

          // Inspect options inside select
          const optionDetails = await el.evaluate((selectEl: HTMLSelectElement) => {
            return Array.from(selectEl.options).map((opt) => ({
              value: opt.value,
              text: opt.text.trim(),
            }));
          });

          const normalizedTarget = field.value.toLowerCase().trim();

          // 1. Exact value match
          let match = optionDetails.find(
            (o) => o.value.toLowerCase() === normalizedTarget || o.text.toLowerCase() === normalizedTarget
          );

          // 2. Partial substring match
          if (!match) {
            match = optionDetails.find(
              (o) =>
                o.value.toLowerCase().includes(normalizedTarget) ||
                o.text.toLowerCase().includes(normalizedTarget) ||
                normalizedTarget.includes(o.text.toLowerCase())
            );
          }

          if (match) {
            await el.selectOption(match.value);
            await el.dispatchEvent('change').catch(() => {});
            await el.dispatchEvent('input').catch(() => {});

            return {
              fieldKey: field.fieldKey,
              label: field.label,
              fieldType: 'SELECT',
              value: match.text || match.value,
              status: 'FILLED',
              selectorUsed: (await el.getAttribute('name')) || (await el.getAttribute('id')) || 'select',
            };
          }

          // If no option matched directly, attempt setting by label text
          try {
            await el.selectOption({ label: field.value });
            await el.dispatchEvent('change').catch(() => {});
            return {
              fieldKey: field.fieldKey,
              label: field.label,
              fieldType: 'SELECT',
              value: field.value,
              status: 'FILLED',
              selectorUsed: 'select',
            };
          } catch {
            // Option not found
          }
        }
      } catch {
        continue;
      }
    }

    return {
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: 'SELECT',
      value: field.value,
      status: 'FAILED',
      error: `Could not match select option '${field.value}' for '${field.label}'`,
    };
  }

  /**
   * Selects matching radio button option in a group.
   */
  private async fillRadio(page: Page, field: FieldToFill): Promise<FieldFillResult> {
    const normalizedTarget = field.value.toLowerCase().trim();

    // Query candidate radio inputs
    const candidateSelectors = [
      `input[type="radio"][name="${field.fieldKey}"]`,
      `input[type="radio"][name*="${field.fieldKey}"]`,
      `input[type="radio"]#${field.fieldKey}`,
      `label:has-text("${field.label}") input[type="radio"]`,
    ];

    for (const sel of candidateSelectors) {
      try {
        const radios = page.locator(sel);
        const count = await radios.count();
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const radio = radios.nth(i);
            const val = (await radio.getAttribute('value')) || '';
            const id = (await radio.getAttribute('id')) || '';

            // Check associated label text
            let labelText = '';
            if (id) {
              const labelLoc = page.locator(`label[for="${id}"]`);
              if ((await labelLoc.count()) > 0) {
                labelText = (await labelLoc.innerText()) || '';
              }
            }

            const isMatch =
              val.toLowerCase() === normalizedTarget ||
              labelText.toLowerCase().trim() === normalizedTarget ||
              labelText.toLowerCase().includes(normalizedTarget) ||
              normalizedTarget.includes(val.toLowerCase());

            if (isMatch) {
              await radio.scrollIntoViewIfNeeded().catch(() => {});
              await radio.check();
              await radio.dispatchEvent('change').catch(() => {});
              return {
                fieldKey: field.fieldKey,
                label: field.label,
                fieldType: 'RADIO',
                value: field.value,
                status: 'FILLED',
                selectorUsed: `${sel}:nth(${i})`,
              };
            }
          }
        }
      } catch {
        continue;
      }
    }

    return {
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: 'RADIO',
      value: field.value,
      status: 'FAILED',
      error: `Could not find radio option matching '${field.value}' for '${field.label}'`,
    };
  }

  /**
   * Toggles checkbox based on truthy/falsy value.
   */
  private async fillCheckbox(page: Page, field: FieldToFill): Promise<FieldFillResult> {
    const locators = this.getCandidateLocators(page, field, 'input[type="checkbox"]');
    const isTruthy = ['true', '1', 'yes', 'checked', 'on'].includes(
      field.value.toLowerCase().trim()
    );

    for (const loc of locators) {
      try {
        const count = await loc.count();
        if (count > 0) {
          const el = loc.first();
          await el.scrollIntoViewIfNeeded().catch(() => {});

          if (isTruthy) {
            await el.check();
          } else {
            await el.uncheck();
          }

          await el.dispatchEvent('change').catch(() => {});

          return {
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: 'CHECKBOX',
            value: isTruthy ? 'checked' : 'unchecked',
            status: 'FILLED',
            selectorUsed: (await el.getAttribute('name')) || (await el.getAttribute('id')) || 'checkbox',
          };
        }
      } catch {
        continue;
      }
    }

    return {
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: 'CHECKBOX',
      value: field.value,
      status: 'FAILED',
      error: `Could not locate checkbox element for '${field.label}' (${field.fieldKey})`,
    };
  }

  /**
   * Uploads attached document using FileUploader.
   */
  private async fillFileInput(page: Page, field: FieldToFill): Promise<FieldFillResult> {
    if (!field.document) {
      return {
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: 'FILE',
        value: field.value,
        status: 'FAILED',
        error: `No document attached to upload for '${field.label}'`,
      };
    }

    const uploadRes = await this.fileUploader.uploadToPage(
      page,
      {
        fieldKey: field.fieldKey,
        label: field.label,
      },
      field.document
    );

    if (uploadRes.success) {
      return {
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: 'FILE',
        value: field.document.name,
        status: 'FILLED',
        selectorUsed: uploadRes.selectorUsed,
      };
    }

    return {
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: 'FILE',
      value: field.document.name,
      status: 'FAILED',
      error: uploadRes.error || `Failed to attach document '${field.document.name}'`,
    };
  }

  /**
   * Safely attempts to save draft on the scholarship portal without final submission.
   */
  private async trySaveDraft(page: Page): Promise<boolean> {
    const draftKeywords = ['save draft', 'save progress', 'save & exit', 'save for later', 'save application'];

    try {
      const buttons = page.locator('button, input[type="button"], a[role="button"]');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const text = ((await btn.innerText().catch(() => '')) || '').toLowerCase().trim();
        const value = ((await btn.getAttribute('value').catch(() => '')) || '').toLowerCase().trim();
        const label = text || value;

        // Verify this is a draft button and NOT a submission trigger
        const isDraft = draftKeywords.some((kw) => label.includes(kw));
        const isSubmit = SubmissionGuard.isSubmissionTrigger(label);

        if (isDraft && !isSubmit) {
          // Explicitly assert can execute
          await SubmissionGuard.assertCanExecuteAction('CLICK', label, true, new Date());
          await btn.click().catch(() => {});
          await page.waitForTimeout(1000).catch(() => {});
          return true;
        }
      }
    } catch {
      // Ignored if draft button not present
    }

    return false;
  }

  /**
   * Navigates multi-page wizard if Next button is present and NOT a submission trigger.
   */
  private async advanceWizardPage(page: Page): Promise<boolean> {
    const nextKeywords = ['next', 'next step', 'continue', 'proceed'];

    try {
      const candidates = page.locator('button, input[type="button"], a.btn, a[role="button"]');
      const count = await candidates.count();

      for (let i = 0; i < count; i++) {
        const btn = candidates.nth(i);
        const text = ((await btn.innerText().catch(() => '')) || '').toLowerCase().trim();
        const value = ((await btn.getAttribute('value').catch(() => '')) || '').toLowerCase().trim();
        const label = text || value;

        const isNext = nextKeywords.some((kw) => label === kw || label.startsWith(`${kw} `));
        const isSubmit = SubmissionGuard.isSubmissionTrigger(label);

        // Advance ONLY if it's a next button and definitely NOT a final submit button
        if (isNext && !isSubmit) {
          await btn.click();
          await page.waitForTimeout(1500);
          return true;
        }
      }
    } catch {
      // Wizard advance failed or not present
    }

    return false;
  }
}
