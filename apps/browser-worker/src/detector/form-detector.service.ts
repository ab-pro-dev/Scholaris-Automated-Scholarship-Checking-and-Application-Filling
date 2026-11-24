import { Page } from 'playwright';
import { PrismaClient, FieldType } from '@scholaris/database';
import {
  extractFormFieldsFromDOM,
  ExtractedDOMField,
  ExtractedDOMFormSummary,
} from './dom-extractor.js';

export interface FormDetectionResult {
  formTitle: string | null;
  fields: ExtractedDOMField[];
  hasMultiPageWizard: boolean;
  estimatedPages: number;
  totalFieldsCount: number;
  requiredFieldsCount: number;
}

export class FormDetectorService {
  constructor(private readonly prisma?: PrismaClient) {}

  /**
   * Traverses a page, handles dynamic JavaScript loading, and extracts all form controls.
   */
  async detectFormFields(
    page: Page,
    options: {
      timeoutMs?: number;
      waitForSelectors?: boolean;
      currentPageNumber?: number;
    } = {}
  ): Promise<FormDetectionResult> {
    const {
      timeoutMs = 15000,
      waitForSelectors = true,
      currentPageNumber = 1,
    } = options;

    // 1. Wait for DOM ready state
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
    } catch {
      // Proceed even if timed out
    }

    // 2. Wait for interactive form elements if dynamic SPA
    if (waitForSelectors) {
      try {
        await page.waitForSelector(
          'form, input:not([type="hidden"]), select, textarea',
          { timeout: Math.min(timeoutMs, 5000) }
        );
      } catch {
        // Proceed with current DOM state if selector not found immediately
      }
    }

    // 3. Execute in-browser DOM extraction
    const summary: ExtractedDOMFormSummary = await page.evaluate(
      ({ pageNum }) => {
        // Helper function declared in dom-extractor.ts
        // In browser context, evaluate the extractor directly
        const clean = (str: string | null | undefined): string => {
          return (str || '').replace(/\s+/g, ' ').trim();
        };

        const resolveLabel = (el: HTMLElement, id: string, name: string): string => {
          if (id) {
            try {
              const explicitLabel = document.querySelector(`label[for="${CSS.escape(id)}"]`);
              if (explicitLabel) {
                const text = clean(explicitLabel.textContent);
                if (text) return text.replace(/\*$/, '').trim();
              }
            } catch {}
          }

          const parentLabel = el.closest('label');
          if (parentLabel) {
            const clone = parentLabel.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('input, select, textarea').forEach((ci) => ci.remove());
            const text = clean(clone.textContent);
            if (text) return text.replace(/\*$/, '').trim();
          }

          const ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel && clean(ariaLabel)) return clean(ariaLabel);

          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl && clean(labelEl.textContent)) return clean(labelEl.textContent);
          }

          const fieldset = el.closest('fieldset');
          if (fieldset) {
            const legend = fieldset.querySelector('legend');
            if (legend && clean(legend.textContent)) return clean(legend.textContent);
          }

          const prev = el.previousElementSibling;
          if (prev && ['SPAN', 'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'LABEL'].includes(prev.tagName)) {
            const prevText = clean(prev.textContent);
            if (prevText && prevText.length < 80) return prevText.replace(/\*$/, '').trim();
          }

          const placeholder = el.getAttribute('placeholder');
          if (placeholder && clean(placeholder)) return clean(placeholder);

          const fallback = name || id || 'unlabeled_field';
          return fallback
            .replace(/[_-]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim();
        };

        const checkIsRequired = (el: HTMLElement, labelText: string): boolean => {
          if (el.hasAttribute('required')) return true;
          if (el.getAttribute('aria-required') === 'true') return true;
          if (labelText.includes('*')) return true;
          const parent = el.parentElement;
          if (parent) {
            const asterisk = parent.querySelector('.required, [class*="required"], [class*="star"], [class*="mandatory"]');
            if (asterisk) return true;
          }
          return false;
        };

        const elements = Array.from(
          document.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select'
          )
        );

        const fields: any[] = [];
        const processedRadioGroups = new Set<string>();

        for (const el of elements) {
          const tagName = el.tagName.toLowerCase();
          const typeAttr = (el.getAttribute('type') || '').toLowerCase();
          const id = el.id || '';
          const name = el.getAttribute('name') || '';

          let fieldType = 'TEXT';
          let options: string[] | null = null;

          if (tagName === 'textarea') {
            fieldType = 'TEXTAREA';
          } else if (tagName === 'select') {
            fieldType = 'SELECT';
            const selectEl = el as HTMLSelectElement;
            options = Array.from(selectEl.options)
              .map((opt) => clean(opt.text || opt.value))
              .filter((opt) => opt.length > 0 && !opt.toLowerCase().includes('select'));
          } else if (typeAttr === 'radio') {
            fieldType = 'RADIO';
            if (name && processedRadioGroups.has(name)) continue;
            if (name) {
              processedRadioGroups.add(name);
              try {
                const siblings = Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`));
                options = siblings.map((r) => {
                  const rLabel = resolveLabel(r, r.id, r.name);
                  return rLabel || r.value || 'Option';
                });
              } catch {
                options = [];
              }
            }
          } else if (typeAttr === 'checkbox') {
            fieldType = 'CHECKBOX';
          } else if (typeAttr === 'file') {
            fieldType = 'FILE';
          } else if (typeAttr === 'date' || typeAttr === 'datetime-local' || typeAttr === 'month') {
            fieldType = 'DATE';
          } else {
            fieldType = 'TEXT';
          }

          const rawLabel = resolveLabel(el, id, name);
          const isRequired = checkIsRequired(el, rawLabel);
          const label = rawLabel.replace(/\*+/g, '').trim() || 'Untitled Field';

          const fieldKey =
            name ||
            id ||
            label
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_+|_+$/g, '')
              .slice(0, 50) ||
            `field_${fields.length + 1}`;

          const placeholder = el.getAttribute('placeholder') || null;
          const defaultValue = (el as HTMLInputElement).value || null;

          let selector = '';
          if (id) {
            selector = `#${id}`;
          } else if (name) {
            selector = `[name="${name}"]`;
          } else {
            selector = `${tagName}[placeholder="${placeholder}"]`;
          }

          fields.push({
            fieldKey,
            label,
            fieldType,
            options,
            isRequired,
            pageNumber: pageNum,
            selector,
            placeholder,
            defaultValue,
          });
        }

        const pageText = document.body.innerText || '';
        const hasStepIndicator =
          /step\s+\d+\s+of\s+\d+/i.test(pageText) ||
          !!document.querySelector('[class*="step-indicator"], [class*="wizard"], [class*="progress-bar"], .steps, #steps');

        let estimatedPages = 1;
        const stepMatch = pageText.match(/step\s+\d+\s+of\s+(\d+)/i);
        if (stepMatch && stepMatch[1]) {
          estimatedPages = parseInt(stepMatch[1], 10) || 1;
        }

        const titleEl = document.querySelector('h1, h2, .form-title, .portal-title');
        const formTitle = titleEl ? clean(titleEl.textContent) : null;

        return {
          formTitle,
          fields,
          hasMultiPageWizard: hasStepIndicator,
          estimatedPages,
        };
      },
      { pageNum: currentPageNumber }
    );

    const requiredCount = summary.fields.filter((f) => f.isRequired).length;

    return {
      formTitle: summary.formTitle,
      fields: summary.fields,
      hasMultiPageWizard: summary.hasMultiPageWizard,
      estimatedPages: summary.estimatedPages,
      totalFieldsCount: summary.fields.length,
      requiredFieldsCount: requiredCount,
    };
  }

  /**
   * Detects form fields on page and persists them into PostgreSQL ApplicationField records.
   */
  async detectAndPersist(
    page: Page,
    applicationId: string,
    options: {
      timeoutMs?: number;
      currentPageNumber?: number;
    } = {}
  ): Promise<FormDetectionResult> {
    const result = await this.detectFormFields(page, options);

    if (this.prisma && applicationId) {
      await this.prisma.$transaction(async (tx) => {
        // Clear previous fields for this application to avoid stale duplicates
        await tx.applicationField.deleteMany({
          where: { applicationId },
        });

        // Insert detected fields
        if (result.fields.length > 0) {
          await Promise.all(
            result.fields.map((field) =>
              tx.applicationField.create({
                data: {
                  applicationId,
                  fieldKey: field.fieldKey,
                  label: field.label,
                  fieldType: field.fieldType as FieldType,
                  options: field.options as any,
                  isRequired: field.isRequired,
                  pageNumber: field.pageNumber,
                },
              })
            )
          );
        }
      });
    }

    return result;
  }
}
