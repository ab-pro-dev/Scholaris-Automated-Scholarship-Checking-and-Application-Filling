import type { DocumentCategory } from '@scholaris/types';

// ==========================================
// System Constants
// ==========================================

export const APP_NAME = 'Scholaris';
export const APP_DESCRIPTION = 'Intelligent Scholarship Verification & Application Assistant';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_DOCUMENT_MIME_TYPES: Record<string, DocumentCategory> = {
  'application/pdf': 'TRANSCRIPT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'CV',
  'image/jpeg': 'CERTIFICATE',
  'image/png': 'CERTIFICATE',
};

export const ALLOWED_URL_PROTOCOLS = ['http:', 'https:'];

// Blocked IP ranges for SSRF prevention
export const BLOCKED_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local / AWS metadata
  /^0\./, // Current network
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 Unique local
  /^fe80:/i, // IPv6 Link-local
];

// ==========================================
// Security & Validation Helpers
// ==========================================

export function isBlockedOrPrivateIP(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(ip.trim()));
}

export function validateSafeExternalUrl(rawUrl: string): { isValid: boolean; error?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(rawUrl);

    if (!ALLOWED_URL_PROTOCOLS.includes(parsed.protocol)) {
      return { isValid: false, error: 'Only http and https protocols are supported' };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return { isValid: false, error: 'Local and internal hostnames are prohibited' };
    }

    if (isBlockedOrPrivateIP(hostname)) {
      return { isValid: false, error: 'Private or local IP destinations are prohibited' };
    }

    return { isValid: true, parsedUrl: parsed };
  } catch {
    return { isValid: false, error: 'Malformed URL' };
  }
}

// ==========================================
// Formatting Utilities
// ==========================================

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

// ==========================================
// Custom Application Errors
// ==========================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request payload', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class SSRFProtectionError extends AppError {
  constructor(message = 'Requested URL failed security validation', details?: unknown) {
    super(message, 400, 'SSRF_BLOCKED', details);
  }
}
