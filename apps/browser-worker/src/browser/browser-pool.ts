import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { env } from '../config/env.js';
import { handleFirewallRoute } from '../security/network-firewall.js';
import fs from 'node:fs';

export interface IsolatedSessionContext {
  context: BrowserContext;
  page: Page;
  blockedRequests: Array<{ url: string; reason: string }>;
  cleanup: () => Promise<void>;
}

export class BrowserPool {
  private browser: Browser | null = null;
  private isInitializing: boolean = false;

  constructor(
    private readonly chromeExecutablePath: string = env.CHROME_PATH,
    private readonly isHeadless: boolean = env.BROWSER_HEADLESS
  ) {}

  /**
   * Returns or initializes the shared Chromium browser instance.
   */
  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (this.browser && this.browser.isConnected()) {
        return this.browser;
      }
    }

    this.isInitializing = true;
    try {
      const options: any = {
        headless: this.isHeadless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-background-networking',
        ],
      };

      if (fs.existsSync(this.chromeExecutablePath)) {
        options.executablePath = this.chromeExecutablePath;
      }

      this.browser = await chromium.launch(options);
      return this.browser;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Creates an isolated, ephemeral browser context with network firewall rules attached.
   */
  async createIsolatedContext(timeoutMs: number = env.BROWSER_TIMEOUT_MS): Promise<IsolatedSessionContext> {
    const browser = await this.getBrowser();

    const blockedRequests: Array<{ url: string; reason: string }> = [];

    // Create incognito context with modern realistic browser fingerprint
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Scholaris/1.0',
      locale: 'en-US',
      timezoneId: 'UTC',
      ignoreHTTPSErrors: false,
    });

    context.setDefaultTimeout(timeoutMs);
    context.setDefaultNavigationTimeout(timeoutMs);

    // Attach SSRF Network Firewall to every request in this context
    await context.route('**/*', async (route, request) => {
      await handleFirewallRoute(route, request, (url, reason) => {
        blockedRequests.push({ url, reason });
      });
    });

    const page = await context.newPage();

    const cleanup = async () => {
      try {
        await context.close();
      } catch (err: any) {
        console.warn(`Context cleanup warning: ${err.message}`);
      }
    };

    return {
      context,
      page,
      blockedRequests,
      cleanup,
    };
  }

  /**
   * Closes the underlying browser process.
   */
  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // Ignored
      }
      this.browser = null;
    }
  }
}
