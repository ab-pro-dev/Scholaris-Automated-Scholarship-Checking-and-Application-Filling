/**
 * PII Anonymization & Sanitization Utility for Scholaris
 * Ensures sensitive student data (Gov IDs, Passports, SSNs, Phones, Financials, Emails)
 * is masked before dispatching prompts to external LLMs (Gemini / OpenRouter).
 */

export interface AnonymizeOptions {
  /**
   * Additional exact strings to mask, e.g. student's real name or custom IDs
   */
  customReplacements?: Record<string, string>;
  /**
   * Preserve email domains (e.g. university .edu domains for eligibility check)
   */
  preserveEmailDomain?: boolean;
}

export interface AnonymizationResult {
  anonymizedText: string;
  mapping: Record<string, string>; // placeholder -> original
  restore: (text: string) => string;
}

// Regex patterns for sensitive PII
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
// Standard international / domestic phone format (e.g., +1-555-123-4567, (555) 123-4567, +251 91 234 5678)
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
// Passport format: 1-2 uppercase letters followed by 6-9 digits
const PASSPORT_REGEX = /\b[A-Z]{1,2}\d{6,9}\b/g;

/**
 * Anonymizes sensitive PII in the given input text.
 */
export function anonymizePII(text: string, options: AnonymizeOptions = {}): AnonymizationResult {
  if (!text) {
    return {
      anonymizedText: '',
      mapping: {},
      restore: (t: string) => t,
    };
  }

  let anonymizedText = text;
  const mapping: Record<string, string> = {};
  let counter = 1;

  const replaceAndTrack = (original: string, prefix: string): string => {
    // If original already mapped, reuse existing placeholder
    const existing = Object.entries(mapping).find(([, val]) => val === original);
    if (existing) {
      return existing[0];
    }
    const placeholder = `[${prefix}_${counter++}]`;
    mapping[placeholder] = original;
    return placeholder;
  };

  // 1. Custom replacements first (e.g., specific student name)
  if (options.customReplacements) {
    for (const [original, placeholder] of Object.entries(options.customReplacements)) {
      if (original && original.length > 1) {
        // Escape special regex chars
        const escaped = original.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        anonymizedText = anonymizedText.replace(regex, (match) => {
          mapping[placeholder] = match;
          return placeholder;
        });
      }
    }
  }

  // 2. SSN / Tax IDs
  anonymizedText = anonymizedText.replace(SSN_REGEX, (match) =>
    replaceAndTrack(match, 'GOV_ID')
  );

  // 3. Credit Cards / Financial accounts
  anonymizedText = anonymizedText.replace(CREDIT_CARD_REGEX, (match) =>
    replaceAndTrack(match, 'FINANCIAL_ACCOUNT')
  );

  // 4. Passports
  anonymizedText = anonymizedText.replace(PASSPORT_REGEX, (match) =>
    replaceAndTrack(match, 'PASSPORT_NO')
  );

  // 5. Emails
  anonymizedText = anonymizedText.replace(EMAIL_REGEX, (match) => {
    if (options.preserveEmailDomain) {
      const parts = match.split('@');
      const placeholder = replaceAndTrack(parts[0], 'USER_EMAIL');
      return `${placeholder}@${parts[1]}`;
    }
    return replaceAndTrack(match, 'EMAIL');
  });

  // 6. Phone Numbers (after emails and passports to avoid accidental sub-matches)
  anonymizedText = anonymizedText.replace(PHONE_REGEX, (match) => {
    // Check if match is plausible phone number (at least 7 digits)
    const digitCount = (match.match(/\d/g) || []).length;
    if (digitCount >= 7 && digitCount <= 15) {
      return replaceAndTrack(match, 'PHONE');
    }
    return match;
  });

  const restore = (t: string): string => deAnonymizePII(t, mapping);

  return {
    anonymizedText,
    mapping,
    restore,
  };
}

/**
 * Restores masked PII in output text using the generated placeholder mapping.
 */
export function deAnonymizePII(text: string, mapping: Record<string, string>): string {
  if (!text || !mapping || Object.keys(mapping).length === 0) {
    return text;
  }

  let restored = text;
  for (const [placeholder, original] of Object.entries(mapping)) {
    const escaped = placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    restored = restored.replace(new RegExp(escaped, 'g'), original);
  }
  return restored;
}
