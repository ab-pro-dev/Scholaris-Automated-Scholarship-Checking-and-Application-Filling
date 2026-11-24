import { Page } from 'playwright';
import { ChallengeType, ChallengeDetectionResult } from '@scholaris/types';

export interface ChallengeDetectionOptions {
  checkCaptcha?: boolean;
  checkLoginWall?: boolean;
  checkMfa?: boolean;
}

export class ChallengeDetector {
  /**
   * Evaluates the current page DOM to detect CAPTCHAs, Cloudflare/anti-bot gates,
   * login walls, or MFA challenges.
   */
  async detectChallenge(
    page: Page,
    options: ChallengeDetectionOptions = {
      checkCaptcha: true,
      checkLoginWall: true,
      checkMfa: true,
    }
  ): Promise<ChallengeDetectionResult> {
    try {
      const evaluation = await page.evaluate((opts) => {
        const clean = (str: string | null | undefined): string => {
          return (str || '').replace(/\s+/g, ' ').trim();
        };

        const pageText = document.body ? clean(document.body.innerText).toLowerCase() : '';
        const titleText = clean(document.title).toLowerCase();

        // 1. CAPTCHA & Anti-Bot Detection
        if (opts.checkCaptcha) {
          // Google reCAPTCHA
          if (
            document.querySelector(
              'iframe[src*="recaptcha"], .g-recaptcha, #recaptcha, [name="g-recaptcha-response"]'
            )
          ) {
            return {
              detected: true,
              challengeType: 'CAPTCHA' as const,
              reason: 'Google reCAPTCHA verification challenge detected on page.',
              selectorFound: 'iframe[src*="recaptcha"], .g-recaptcha, #recaptcha',
              instructions:
                'The scholarship portal requires human verification (Google reCAPTCHA). Please complete the challenge in the browser window to continue.',
            };
          }

          // hCaptcha
          if (
            document.querySelector(
              'iframe[src*="hcaptcha"], .h-captcha, [name="h-captcha-response"]'
            )
          ) {
            return {
              detected: true,
              challengeType: 'CAPTCHA' as const,
              reason: 'hCaptcha verification challenge detected on page.',
              selectorFound: 'iframe[src*="hcaptcha"], .h-captcha',
              instructions:
                'The scholarship portal requires human verification (hCaptcha). Please complete the challenge in the browser window to continue.',
            };
          }

          // Cloudflare Turnstile / Managed Challenge
          if (
            document.querySelector(
              'iframe[src*="challenges.cloudflare.com"], .cf-turnstile, #cf-challenge, [name="cf-turnstile-response"]'
            ) ||
            pageText.includes('checking your browser before accessing') ||
            pageText.includes('verify you are human') ||
            (pageText.includes('cloudflare') && pageText.includes('please wait'))
          ) {
            return {
              detected: true,
              challengeType: 'BOT_DETECTION' as const,
              reason: 'Cloudflare Turnstile or anti-bot challenge detected on page.',
              selectorFound: '.cf-turnstile, #cf-challenge',
              instructions:
                'Cloudflare browser verification detected. Please complete the verification in the portal window.',
            };
          }

          // Arkose Labs / FunCaptcha
          if (document.querySelector('iframe[src*="arkoselabs"], #fc-iframe-wrap')) {
            return {
              detected: true,
              challengeType: 'CAPTCHA' as const,
              reason: 'Arkose Labs FunCaptcha challenge detected on page.',
              selectorFound: 'iframe[src*="arkoselabs"], #fc-iframe-wrap',
              instructions:
                'Interactive puzzle verification detected. Please complete the challenge in the portal window.',
            };
          }

          // Generic CAPTCHA elements
          if (
            document.querySelector('[id*="captcha" i], [class*="captcha" i]') &&
            !document.querySelector('form#scholarship-form') // avoid false positive on custom form ids
          ) {
            return {
              detected: true,
              challengeType: 'CAPTCHA' as const,
              reason: 'Generic CAPTCHA verification element detected on page.',
              selectorFound: '[id*="captcha" i], [class*="captcha" i]',
              instructions:
                'The scholarship portal requires human verification. Please solve the CAPTCHA in the portal window.',
            };
          }
        }

        // 2. Login Wall Detection
        if (opts.checkLoginWall) {
          const hasPasswordField = !!document.querySelector('input[type="password"]');
          const hasLoginForm = !!document.querySelector(
            'form[action*="login" i], form[action*="signin" i], #login-form, .login-container, #login'
          );
          const hasLoginText =
            (pageText.includes('sign in to your account') ||
              pageText.includes('please log in to continue') ||
              pageText.includes('enter your username and password') ||
              titleText.includes('login') ||
              titleText.includes('sign in')) &&
            hasPasswordField;

          if (hasPasswordField || hasLoginForm || hasLoginText) {
            return {
              detected: true,
              challengeType: 'LOGIN_REQUIRED' as const,
              reason: 'External scholarship portal requires user authentication / login.',
              selectorFound: hasPasswordField ? 'input[type="password"]' : 'form[action*="login"]',
              instructions:
                'The scholarship portal requires you to log into your account. Please log in directly in the portal window. Scholaris never collects or stores your external passwords.',
            };
          }
        }

        // 3. Multi-Factor Authentication (MFA / 2FA)
        if (opts.checkMfa) {
          const hasMfaText =
            pageText.includes('two-factor authentication') ||
            pageText.includes('verification code') ||
            pageText.includes('one-time password') ||
            pageText.includes('enter the 6-digit code') ||
            pageText.includes('authentication code sent');

          const hasMfaInput = !!document.querySelector(
            'input[name*="otp" i], input[name*="code" i], input[name*="mfa" i], input[id*="otp" i], input[id*="mfa" i]'
          );

          if (hasMfaText && hasMfaInput) {
            return {
              detected: true,
              challengeType: 'TWO_FACTOR_AUTH' as const,
              reason: 'Two-Factor / Multi-Factor Authentication prompt detected on page.',
              selectorFound: 'input[name*="otp"], input[name*="code"]',
              instructions:
                'Two-Factor Authentication (2FA) is required. Please check your authenticator app or phone and enter your verification code directly in the portal window.',
            };
          }
        }

        return {
          detected: false,
          challengeType: null,
          reason: null,
          selectorFound: null,
          instructions: '',
        };
      }, options);

      return evaluation;
    } catch (err: any) {
      // In case evaluation fails due to navigation or premature page close
      return {
        detected: false,
        challengeType: null,
        reason: null,
        selectorFound: null,
        instructions: '',
      };
    }
  }

  /**
   * Sanitizes form field values to strictly remove any credentials or password fields.
   * Enforces the invariant: External account credentials are never logged or stored by Scholaris.
   */
  sanitizeFieldValues(
    fieldValues?: Record<string, string> | null
  ): Record<string, string> {
    if (!fieldValues) return {};

    const sanitized: Record<string, string> = {};
    const credentialRegex = /password|pass|secret|pin|token|credential|auth_key|private/i;

    for (const [key, val] of Object.entries(fieldValues)) {
      if (credentialRegex.test(key)) {
        // Strip out credential completely
        continue;
      }
      sanitized[key] = val;
    }

    return sanitized;
  }
}
