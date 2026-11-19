import { validateUrlForSSRF, SSRFProtectionError } from './ssrf-validator.js';
import { AppError } from '@scholaris/shared';

export interface FetchedWebContent {
  html: string;
  cleanText: string;
  title: string;
  metaDescription?: string;
  finalUrl: string;
  statusCode: number;
  contentLengthBytes: number;
}

export interface FetcherOptions {
  timeoutMs?: number; // Default 10,000ms
  maxSizeBytes?: number; // Default 2MB (2,097,152 bytes)
  maxRedirects?: number; // Default 5
  customDnsResolver?: (host: string) => Promise<string[]>;
}

export class ScholarshipFetcherService {
  private readonly timeoutMs: number;
  private readonly maxSizeBytes: number;
  private readonly maxRedirects: number;
  private readonly customResolver?: (host: string) => Promise<string[]>;

  constructor(options: FetcherOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxSizeBytes = options.maxSizeBytes ?? 2 * 1024 * 1024; // 2MB
    this.maxRedirects = options.maxRedirects ?? 5;
    this.customResolver = options.customDnsResolver;
  }

  /**
   * Securely fetches web content from a scholarship URL with SSRF protection,
   * safe redirect re-validation, timeout enforcement, and response body size limits.
   */
  async fetchSafeContent(targetUrl: string): Promise<FetchedWebContent> {
    let currentUrl = targetUrl;
    let redirectCount = 0;

    while (redirectCount <= this.maxRedirects) {
      // 1. Validate current URL against SSRF
      const validation = await validateUrlForSSRF(currentUrl, this.customResolver);

      // 2. Setup timeout controller
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(validation.normalizedUrl, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'manual', // Crucial: manual inspection of every redirect
          headers: {
            'User-Agent':
              'ScholarisBot/1.0 (+https://scholaris.app/bot; academic scholarship verification)',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
        });

        clearTimeout(timer);

        // 3. Handle Redirects (301, 302, 303, 307, 308)
        if (
          response.status === 301 ||
          response.status === 302 ||
          response.status === 303 ||
          response.status === 307 ||
          response.status === 308
        ) {
          const location = response.headers.get('location');
          if (!location) {
            throw new AppError('Redirect response missing Location header', 400);
          }

          // Resolve relative redirect against current URL
          const resolvedRedirect = new URL(location, currentUrl).toString();
          redirectCount++;

          if (redirectCount > this.maxRedirects) {
            throw new AppError(
              `Maximum redirect depth (${this.maxRedirects}) exceeded`,
              400,
              'TOO_MANY_REDIRECTS'
            );
          }

          currentUrl = resolvedRedirect;
          continue; // Loop to next hop with SSRF validation
        }

        // 4. Check HTTP Status
        if (!response.ok) {
          throw new AppError(
            `Remote server responded with HTTP status ${response.status} (${response.statusText})`,
            response.status >= 500 ? 502 : response.status
          );
        }

        // 5. Pre-check Content-Length header if provided
        const contentLengthHeader = response.headers.get('content-length');
        if (contentLengthHeader) {
          const declaredBytes = parseInt(contentLengthHeader, 10);
          if (!isNaN(declaredBytes) && declaredBytes > this.maxSizeBytes) {
            throw new AppError(
              `Page size (${Math.round(declaredBytes / 1024)} KB) exceeds the safe limit of ${Math.round(this.maxSizeBytes / 1024)} KB`,
              413,
              'PAYLOAD_TOO_LARGE'
            );
          }
        }

        // 6. Read response body with streaming byte count limit
        const bodyBuffer = await this.readBodyWithLimit(response);
        const html = bodyBuffer.toString('utf-8');

        // 7. Parse metadata & clean text
        const { title, metaDescription, cleanText } = this.extractHtmlMetadata(
          html,
          validation.hostname
        );

        return {
          html,
          cleanText,
          title,
          metaDescription,
          finalUrl: currentUrl,
          statusCode: response.status,
          contentLengthBytes: bodyBuffer.length,
        };
      } catch (err: any) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          throw new AppError(
            `Request to '${currentUrl}' timed out after ${this.timeoutMs / 1000} seconds`,
            504,
            'REQUEST_TIMEOUT'
          );
        }
        if (err instanceof AppError || err instanceof SSRFProtectionError) {
          throw err;
        }
        throw new AppError(`Failed to fetch scholarship content: ${err.message}`, 502);
      }
    }

    throw new AppError('Unexpected termination of redirect chain', 500);
  }

  /**
   * Reads stream chunk by chunk, aborting immediately if bytes exceed maxSizeBytes.
   */
  private async readBodyWithLimit(response: Response): Promise<Buffer> {
    if (!response.body) {
      return Buffer.from('');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > this.maxSizeBytes) {
            reader.cancel();
            throw new AppError(
              `Page response exceeded maximum safe limit of ${Math.round(this.maxSizeBytes / 1024)} KB`,
              413,
              'PAYLOAD_TOO_LARGE'
            );
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }

  /**
   * Extracts page title, meta description, and clean text snippet from HTML string.
   */
  private extractHtmlMetadata(
    html: string,
    fallbackDomain: string
  ): { title: string; metaDescription?: string; cleanText: string } {
    let title = '';
    let metaDescription: string | undefined;

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/\s+/g, ' ').trim();
    }

    // Extract <meta name="description" content="...">
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

    if (descMatch && descMatch[1]) {
      metaDescription = descMatch[1].replace(/\s+/g, ' ').trim();
    }

    // Fallback title if none found
    if (!title) {
      title = `Scholarship opportunity at ${fallbackDomain}`;
    }

    // Clean text snippet: strip scripts, styles, tags, normalize whitespace
    let cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Cap clean text snippet at 8,000 characters
    if (cleanText.length > 8000) {
      cleanText = cleanText.substring(0, 8000) + '...';
    }

    return {
      title,
      metaDescription,
      cleanText,
    };
  }
}
