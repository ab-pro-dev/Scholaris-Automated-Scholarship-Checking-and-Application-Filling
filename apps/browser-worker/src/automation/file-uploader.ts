import { Page } from 'playwright';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

export interface DocumentPayload {
  id: string;
  name: string;
  mimeType: string;
  fileKey: string;
  fileUrl?: string | null;
  buffer?: Buffer;
}

export interface UploadTargetOptions {
  selector?: string;
  fieldKey?: string;
  label?: string;
}

export type BufferLoaderFn = (doc: DocumentPayload) => Promise<Buffer>;

export class FileUploader {
  private s3Client?: S3Client;
  private customBufferLoader?: BufferLoaderFn;

  constructor(options?: {
    s3Client?: S3Client;
    customBufferLoader?: BufferLoaderFn;
  }) {
    if (options?.customBufferLoader) {
      this.customBufferLoader = options.customBufferLoader;
    }

    if (options?.s3Client) {
      this.s3Client = options.s3Client;
    } else if (env.S3_ACCESS_KEY && env.S3_SECRET_KEY) {
      this.s3Client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
        },
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
      });
    }
  }

  /**
   * Safely downloads the document binary buffer from S3 or provided URL.
   */
  async fetchDocumentBuffer(doc: DocumentPayload): Promise<Buffer> {
    if (doc.buffer && doc.buffer.length > 0) {
      return doc.buffer;
    }

    if (this.customBufferLoader) {
      return await this.customBufferLoader(doc);
    }

    // Try direct S3 download
    if (this.s3Client && doc.fileKey) {
      try {
        const command = new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: doc.fileKey,
        });
        const response = await this.s3Client.send(command);
        if (response.Body) {
          const bytes = await response.Body.transformToByteArray();
          return Buffer.from(bytes);
        }
      } catch (err: any) {
        console.warn(`Direct S3 download failed for key ${doc.fileKey}: ${err.message}. Trying URL fallback...`);
      }
    }

    // Fallback to fileUrl via fetch if provided
    if (doc.fileUrl) {
      const response = await fetch(doc.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download document from URL: HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw new Error(
      `Cannot retrieve document buffer for '${doc.name}' (${doc.id}): No S3 access or download URL available.`
    );
  }

  /**
   * Finds the target file input element on the page and uploads the document.
   */
  async uploadToPage(
    page: Page,
    target: UploadTargetOptions,
    doc: DocumentPayload
  ): Promise<{ success: boolean; selectorUsed: string; error?: string }> {
    const buffer = await this.fetchDocumentBuffer(doc);

    // Build candidate selectors
    const selectors: string[] = [];
    if (target.selector) {
      selectors.push(target.selector);
    }
    if (target.fieldKey) {
      selectors.push(
        `input[type="file"][name="${target.fieldKey}"]`,
        `input[type="file"]#${target.fieldKey}`,
        `input[type="file"][id*="${target.fieldKey}"]`,
        `input[type="file"][name*="${target.fieldKey}"]`
      );
    }
    if (target.label) {
      const cleanLabel = target.label.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      selectors.push(
        `input[type="file"][aria-label*="${cleanLabel}"]`,
        `label:has-text("${cleanLabel}") input[type="file"]`
      );
    }
    // Generic fallback for single file input forms
    selectors.push('input[type="file"]');

    let matchedSelector: string | null = null;
    let fileInputLocator = null;

    for (const sel of selectors) {
      try {
        const loc = page.locator(sel).first();
        const count = await loc.count();
        if (count > 0) {
          matchedSelector = sel;
          fileInputLocator = loc;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!fileInputLocator || !matchedSelector) {
      return {
        success: false,
        selectorUsed: '',
        error: `Could not locate file input element for '${target.label || target.fieldKey || 'file'}' on page.`,
      };
    }

    try {
      // Use Playwright's setInputFiles to attach the document safely
      await fileInputLocator.setInputFiles({
        name: doc.name || 'document.pdf',
        mimeType: doc.mimeType || 'application/pdf',
        buffer,
      });

      // Dispatch change and input events to trigger reactive framework handlers
      await fileInputLocator.dispatchEvent('change').catch(() => {});
      await fileInputLocator.dispatchEvent('input').catch(() => {});

      return {
        success: true,
        selectorUsed: matchedSelector,
      };
    } catch (err: any) {
      return {
        success: false,
        selectorUsed: matchedSelector,
        error: `Failed to attach file to input '${matchedSelector}': ${err.message}`,
      };
    }
  }
}
