import { describe, it, expect } from 'vitest';
import {
  SubmissionGuard,
  MandatorySubmissionApprovalError,
} from '../src/security/submission-guard.js';

describe('Mandatory Submission Guard (TASK-021)', () => {
  it('correctly identifies submission triggers by text and element type', () => {
    expect(SubmissionGuard.isSubmissionTrigger('Submit Application', 'button')).toBe(true);
    expect(SubmissionGuard.isSubmissionTrigger('Confirm and Submit', null)).toBe(true);
    expect(SubmissionGuard.isSubmissionTrigger('Submit', 'submit')).toBe(true);
    expect(SubmissionGuard.isSubmissionTrigger('Send Application Now', 'button')).toBe(true);

    // Non-submission actions
    expect(SubmissionGuard.isSubmissionTrigger('Next Section', 'button')).toBe(false);
    expect(SubmissionGuard.isSubmissionTrigger('Save Draft', 'button')).toBe(false);
    expect(SubmissionGuard.isSubmissionTrigger('Upload Transcript', 'button')).toBe(false);
  });

  it('strictly blocks automated submission when user has NOT approved', async () => {
    await expect(
      SubmissionGuard.assertCanExecuteAction(
        'SUBMIT',
        'button#submit-application',
        false, // Not approved
        null
      )
    ).rejects.toThrowError(MandatorySubmissionApprovalError);

    await expect(
      SubmissionGuard.assertCanExecuteAction(
        'CLICK',
        'Confirm and Submit Application',
        false, // Not approved
        null
      )
    ).rejects.toThrowError(/Explicit student authorization required before submitting/);
  });

  it('allows submission when explicit user approval and timestamp are provided', async () => {
    await expect(
      SubmissionGuard.assertCanExecuteAction(
        'SUBMIT',
        'button#submit-application',
        true, // Approved
        new Date()
      )
    ).resolves.toBeUndefined();
  });

  it('allows regular form interactions like typing or navigating steps without submission approval', async () => {
    await expect(
      SubmissionGuard.assertCanExecuteAction(
        'FILL',
        'input[name="first_name"]',
        false
      )
    ).resolves.toBeUndefined();

    await expect(
      SubmissionGuard.assertCanExecuteAction(
        'CLICK',
        'button#next-step',
        false
      )
    ).resolves.toBeUndefined();
  });
});
