import { Page, ElementHandle } from 'playwright';

export class MandatorySubmissionApprovalError extends Error {
  constructor(message: string = 'Automated final application submission blocked: Explicit student authorization required before submitting.') {
    super(message);
    this.name = 'MandatorySubmissionApprovalError';
  }
}

// Patterns identifying final submission triggers on scholarship portals
const SUBMISSION_KEYWORDS = [
  'submit application',
  'final submit',
  'submit now',
  'submit my application',
  'confirm and submit',
  'complete submission',
  'send application',
  'apply now',
  'submit form',
];

export class SubmissionGuard {
  /**
   * Verifies whether an element or button is a final submission trigger.
   */
  static isSubmissionTrigger(text: string, type?: string | null, name?: string | null): boolean {
    const normalizedText = (text || '').toLowerCase().trim();
    const normalizedName = (name || '').toLowerCase().trim();
    const isSubmitType = type?.toLowerCase() === 'submit';

    const matchesKeyword = SUBMISSION_KEYWORDS.some(
      (kw) => normalizedText.includes(kw) || normalizedName.includes(kw)
    );

    return isSubmitType || matchesKeyword;
  }

  /**
   * Guards a page action: blocks any click or trigger on final submission elements
   * unless user has explicitly provided authorization.
   */
  static async assertCanExecuteAction(
    actionType: 'CLICK' | 'SUBMIT' | 'FILL',
    targetSelectorOrText: string,
    isUserApproved: boolean,
    userApprovedAt?: Date | string | null
  ): Promise<void> {
    const isSubmitIntent =
      actionType === 'SUBMIT' ||
      SUBMISSION_KEYWORDS.some((kw) => targetSelectorOrText.toLowerCase().includes(kw));

    if (isSubmitIntent) {
      if (!isUserApproved || !userApprovedAt) {
        throw new MandatorySubmissionApprovalError(
          `Security violation: Attempted automated action on final submission target '${targetSelectorOrText}'. Explicit student authorization required before submitting applications.`
        );
      }
    }
  }

  /**
   * Scans a Playwright Page for potential final submission buttons and returns their details
   * without clicking them.
   */
  static async findSubmissionButtons(page: Page): Promise<Array<{ text: string; selector: string }>> {
    return page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll('button, input[type="submit"], a[role="button"]')
      );

      const triggers: Array<{ text: string; selector: string }> = [];

      for (const el of candidates) {
        const text = (el.textContent || (el as HTMLInputElement).value || '').trim();
        const lower = text.toLowerCase();
        const keywords = [
          'submit',
          'apply',
          'confirm',
          'send application',
          'final',
        ];

        if (keywords.some((kw) => lower.includes(kw))) {
          const id = el.id ? `#${el.id}` : '';
          const name = el.getAttribute('name') ? `[name="${el.getAttribute('name')}"]` : '';
          triggers.push({
            text,
            selector: id || name || el.tagName.toLowerCase(),
          });
        }
      }

      return triggers;
    });
  }
}
